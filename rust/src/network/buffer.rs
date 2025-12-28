use std::alloc::{alloc, dealloc, Layout};
use std::ptr;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;

/// ゼロコピーリングバッファ - 高速パケット処理用
pub struct RingBuffer {
    buffer: *mut u8,
    capacity: usize,
    head: AtomicUsize,
    tail: AtomicUsize,
    size: AtomicU64,
}

unsafe impl Send for RingBuffer {}
unsafe impl Sync for RingBuffer {}

impl RingBuffer {
    /// 新しいリングバッファを作成
    pub fn new(capacity: usize) -> Self {
        // 容量を2の累乗に調整
        let capacity = capacity.next_power_of_two();

        let layout = Layout::from_size_align(capacity, 8).unwrap();
        let buffer = unsafe { alloc(layout) };

        if buffer.is_null() {
            panic!("Failed to allocate ring buffer");
        }

        RingBuffer {
            buffer,
            capacity,
            head: AtomicUsize::new(0),
            tail: AtomicUsize::new(0),
            size: AtomicU64::new(0),
        }
    }

    /// データを書き込む（ゼロコピー）
    pub fn write(&self, data: &[u8]) -> Result<(), RingBufferError> {
        let data_len = data.len();

        if data_len > self.available_write() {
            return Err(RingBufferError::BufferFull);
        }

        let tail = self.tail.load(Ordering::Acquire);
        let mask = self.capacity - 1;

        // リングバッファの末尾にラップアラウンドを考慮して書き込み
        let first_part_len = (self.capacity - tail).min(data_len);

        unsafe {
            ptr::copy_nonoverlapping(
                data.as_ptr(),
                self.buffer.add(tail),
                first_part_len,
            );

            // 残りの部分を先頭から書き込み
            if first_part_len < data_len {
                ptr::copy_nonoverlapping(
                    data.as_ptr().add(first_part_len),
                    self.buffer,
                    data_len - first_part_len,
                );
            }
        }

        // tailを更新
        self.tail.store((tail + data_len) & mask, Ordering::Release);
        self.size.fetch_add(data_len as u64, Ordering::Release);

        Ok(())
    }

    /// データを読み込む（ゼロコピー）
    pub fn read(&self, buf: &mut [u8]) -> Result<usize, RingBufferError> {
        let available = self.available_read();
        if available == 0 {
            return Err(RingBufferError::BufferEmpty);
        }

        let read_len = available.min(buf.len());
        let head = self.head.load(Ordering::Acquire);
        let mask = self.capacity - 1;

        let first_part_len = (self.capacity - head).min(read_len);

        unsafe {
            ptr::copy_nonoverlapping(
                self.buffer.add(head),
                buf.as_mut_ptr(),
                first_part_len,
            );

            if first_part_len < read_len {
                ptr::copy_nonoverlapping(
                    self.buffer,
                    buf.as_mut_ptr().add(first_part_len),
                    read_len - first_part_len,
                );
            }
        }

        self.head.store((head + read_len) & mask, Ordering::Release);
        self.size.fetch_sub(read_len as u64, Ordering::Release);

        Ok(read_len)
    }

    /// 書き込み可能なバイト数
    pub fn available_write(&self) -> usize {
        self.capacity - self.available_read()
    }

    /// 読み込み可能なバイト数
    pub fn available_read(&self) -> usize {
        let head = self.head.load(Ordering::Acquire);
        let tail = self.tail.load(Ordering::Acquire);

        if tail >= head {
            tail - head
        } else {
            self.capacity - head + tail
        }
    }

    /// バッファの容量
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// 総データサイズ（統計用）
    pub fn total_bytes(&self) -> u64 {
        self.size.load(Ordering::Relaxed)
    }
}

impl Drop for RingBuffer {
    fn drop(&mut self) {
        unsafe {
            let layout = Layout::from_size_align(self.capacity, 8).unwrap();
            dealloc(self.buffer, layout);
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RingBufferError {
    BufferFull,
    BufferEmpty,
}

/// パケットプール - 事前割り当てによるメモリ効率化
pub struct PacketPool {
    pool: Vec<Arc<Vec<u8>>>,
    mtu: usize,
    allocated: AtomicU64,
}

impl PacketPool {
    pub fn new(pool_size: usize, mtu: usize) -> Self {
        let mut pool = Vec::with_capacity(pool_size);

        for _ in 0..pool_size {
            pool.push(Arc::new(vec![0u8; mtu]));
        }

        PacketPool {
            pool,
            mtu,
            allocated: AtomicU64::new(0),
        }
    }

    /// パケットバッファを取得
    pub fn acquire(&mut self) -> Option<Arc<Vec<u8>>> {
        if let Some(buf) = self.pool.pop() {
            self.allocated.fetch_add(1, Ordering::Relaxed);
            Some(buf)
        } else {
            // プールが空の場合は新規割り当て
            self.allocated.fetch_add(1, Ordering::Relaxed);
            Some(Arc::new(vec![0u8; self.mtu]))
        }
    }

    /// パケットバッファを返却
    pub fn release(&mut self, buf: Arc<Vec<u8>>) {
        if Arc::strong_count(&buf) == 1 {
            self.pool.push(buf);
            self.allocated.fetch_sub(1, Ordering::Relaxed);
        }
    }

    /// 割り当て済みバッファ数
    pub fn allocated_count(&self) -> u64 {
        self.allocated.load(Ordering::Relaxed)
    }
}

/// SPSC (Single Producer Single Consumer) キュー - ロックフリー
pub struct SpscQueue<T> {
    buffer: Vec<Option<T>>,
    capacity: usize,
    head: AtomicUsize,
    tail: AtomicUsize,
}

impl<T> SpscQueue<T> {
    pub fn new(capacity: usize) -> Self {
        let capacity = capacity.next_power_of_two();
        let mut buffer = Vec::with_capacity(capacity);
        for _ in 0..capacity {
            buffer.push(None);
        }

        SpscQueue {
            buffer,
            capacity,
            head: AtomicUsize::new(0),
            tail: AtomicUsize::new(0),
        }
    }

    /// キューに追加（Producer側）
    pub fn push(&mut self, item: T) -> Result<(), T> {
        let tail = self.tail.load(Ordering::Relaxed);
        let next_tail = (tail + 1) & (self.capacity - 1);

        if next_tail == self.head.load(Ordering::Acquire) {
            return Err(item); // キューが満杯
        }

        self.buffer[tail] = Some(item);
        self.tail.store(next_tail, Ordering::Release);

        Ok(())
    }

    /// キューから取得（Consumer側）
    pub fn pop(&mut self) -> Option<T> {
        let head = self.head.load(Ordering::Relaxed);

        if head == self.tail.load(Ordering::Acquire) {
            return None; // キューが空
        }

        let item = self.buffer[head].take();
        self.head.store((head + 1) & (self.capacity - 1), Ordering::Release);

        item
    }

    /// キューのサイズ
    pub fn len(&self) -> usize {
        let head = self.head.load(Ordering::Relaxed);
        let tail = self.tail.load(Ordering::Relaxed);

        if tail >= head {
            tail - head
        } else {
            self.capacity - head + tail
        }
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ring_buffer() {
        let buffer = RingBuffer::new(1024);

        let data = b"Hello, World!";
        buffer.write(data).unwrap();

        let mut read_buf = vec![0u8; 100];
        let read_len = buffer.read(&mut read_buf).unwrap();

        assert_eq!(read_len, data.len());
        assert_eq!(&read_buf[..read_len], data);
    }

    #[test]
    fn test_ring_buffer_wrap_around() {
        let buffer = RingBuffer::new(16);

        // バッファを満たす
        let data1 = b"12345678";
        buffer.write(data1).unwrap();

        // 一部読み出す
        let mut read_buf = vec![0u8; 4];
        buffer.read(&mut read_buf).unwrap();

        // 再度書き込み（ラップアラウンド）
        let data2 = b"ABCD";
        buffer.write(data2).unwrap();

        // 残りを全て読み出す
        let mut read_buf2 = vec![0u8; 100];
        let len = buffer.read(&mut read_buf2).unwrap();

        assert_eq!(&read_buf2[..len], b"5678ABCD");
    }

    #[test]
    fn test_packet_pool() {
        let mut pool = PacketPool::new(10, 1500);

        let buf1 = pool.acquire().unwrap();
        let buf2 = pool.acquire().unwrap();

        assert_eq!(pool.allocated_count(), 2);

        pool.release(buf1);
        assert_eq!(pool.allocated_count(), 1);
    }

    #[test]
    fn test_spsc_queue() {
        let mut queue = SpscQueue::new(8);

        queue.push(1).unwrap();
        queue.push(2).unwrap();
        queue.push(3).unwrap();

        assert_eq!(queue.len(), 3);

        assert_eq!(queue.pop(), Some(1));
        assert_eq!(queue.pop(), Some(2));
        assert_eq!(queue.pop(), Some(3));
        assert_eq!(queue.pop(), None);
    }
}
