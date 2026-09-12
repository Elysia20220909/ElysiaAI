//! Fixed two-party channel. Authority lives in per-process kernel tables, not tokens alone.
use core::array;
pub const MAX_MESSAGE: usize = 64;
pub const QUEUE_CAPACITY: usize = 2;
pub const EBADF: u64 = (-9i64) as u64;
pub const EACCES: u64 = (-13i64) as u64;
pub const EAGAIN: u64 = (-11i64) as u64;
pub const EPIPE: u64 = (-32i64) as u64;
pub const EMSGSIZE: u64 = (-90i64) as u64;
pub const EDEADLK: u64 = (-35i64) as u64;
#[derive(Clone, Copy, PartialEq, Eq)]
enum Right {
    Send,
    Receive,
}
#[derive(Clone, Copy)]
struct Capability {
    token: u64,
    generation: u64,
    endpoint: usize,
    right: Right,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Message {
    pub bytes: [u8; MAX_MESSAGE],
    pub length: usize,
}
impl Message {
    const EMPTY: Self = Self {
        bytes: [0; MAX_MESSAGE],
        length: 0,
    };
}
#[derive(Clone, Copy)]
struct Queue {
    messages: [Message; QUEUE_CAPACITY],
    head: usize,
    length: usize,
}
impl Queue {
    const EMPTY: Self = Self {
        messages: [Message::EMPTY; QUEUE_CAPACITY],
        head: 0,
        length: 0,
    };
    fn push(&mut self, bytes: &[u8]) -> Result<(), u64> {
        if self.length == QUEUE_CAPACITY {
            return Err(EAGAIN);
        }
        let slot = (self.head + self.length) % QUEUE_CAPACITY;
        let mut message = Message::EMPTY;
        message.bytes[..bytes.len()].copy_from_slice(bytes);
        message.length = bytes.len();
        self.messages[slot] = message;
        self.length += 1;
        Ok(())
    }
    fn pop(&mut self, capacity: usize) -> Result<Option<Message>, u64> {
        if self.length == 0 {
            return Ok(None);
        }
        let message = self.messages[self.head];
        if capacity < message.length {
            return Err(EMSGSIZE);
        }
        self.messages[self.head] = Message::EMPTY;
        self.head = (self.head + 1) % QUEUE_CAPACITY;
        self.length -= 1;
        Ok(Some(message))
    }
}
pub struct Channel {
    generation: u64,
    next_token: u64,
    capabilities: [[Option<Capability>; 2]; 2],
    queues: [Queue; 2],
    alive: [bool; 2],
    open: bool,
}
impl Channel {
    pub const EMPTY: Self = Self {
        generation: 0,
        next_token: 1,
        capabilities: [[None; 2]; 2],
        queues: [Queue::EMPTY; 2],
        alive: [false; 2],
        open: false,
    };
    /// A new lifetime never resets the generation or token sequence. Overflow fails closed.
    /// Return [send-to-peer, receive-own-inbox] for each process.
    pub fn start_pair(&mut self) -> Result<[[u64; 2]; 2], u64> {
        if !self.is_clean() {
            return Err(EAGAIN);
        }
        let generation = self.generation.checked_add(1).ok_or(EBADF)?;
        let end = self.next_token.checked_add(4).ok_or(EBADF)?;
        let first = self.next_token;
        self.capabilities = array::from_fn(|pid| {
            array::from_fn(|slot| {
                Some(Capability {
                    token: first + (pid * 2 + slot) as u64,
                    generation,
                    endpoint: if slot == 0 { 1 - pid } else { pid },
                    right: if slot == 0 {
                        Right::Send
                    } else {
                        Right::Receive
                    },
                })
            })
        });
        self.generation = generation;
        self.next_token = end;
        self.alive = [true; 2];
        self.open = true;
        Ok(array::from_fn(|pid| {
            [first + (pid * 2) as u64, first + (pid * 2 + 1) as u64]
        }))
    }
    fn resolve(&self, pid: usize, token: u64, right: Right) -> Result<usize, u64> {
        let table = self.capabilities.get(pid).ok_or(EBADF)?;
        let cap = table
            .iter()
            .flatten()
            .find(|cap| cap.token == token)
            .ok_or(EBADF)?;
        if cap.generation != self.generation {
            return Err(EBADF);
        }
        if cap.right != right {
            return Err(EACCES);
        }
        if !self.open || !self.alive[pid] || !self.alive[1 - pid] {
            return Err(EPIPE);
        }
        Ok(cap.endpoint)
    }
    pub fn send(&mut self, pid: usize, token: u64, bytes: &[u8]) -> Result<usize, u64> {
        let endpoint = self.resolve(pid, token, Right::Send)?;
        if bytes.len() > MAX_MESSAGE {
            return Err(EMSGSIZE);
        }
        self.queues[endpoint].push(bytes)?;
        Ok(bytes.len())
    }
    pub fn receive(
        &mut self,
        pid: usize,
        token: u64,
        capacity: usize,
    ) -> Result<Option<Message>, u64> {
        let endpoint = self.resolve(pid, token, Right::Receive)?;
        if capacity > MAX_MESSAGE {
            return Err(EMSGSIZE);
        }
        self.queues[endpoint].pop(capacity)
    }
    /// Only a receive owner can revoke this paired channel. Stale grants stay invalid.
    pub fn revoke(&mut self, pid: usize, token: u64) -> Result<(), u64> {
        self.resolve(pid, token, Right::Receive)?;
        let generation = self.generation.checked_add(1).ok_or(EBADF)?;
        self.generation = generation;
        self.open = false;
        self.queues = [Queue::EMPTY; 2];
        Ok(())
    }
    /// Closing either participant discards both queues; callers receive EPIPE.
    pub fn close_process(&mut self, pid: usize) {
        if pid >= 2 {
            return;
        }
        self.alive[pid] = false;
        self.capabilities[pid] = [None; 2];
        self.open = false;
        self.queues = [Queue::EMPTY; 2];
    }
    pub fn is_open(&self) -> bool {
        self.open
    }
    pub fn is_clean(&self) -> bool {
        !self.open
            && self.alive == [false; 2]
            && self.capabilities.iter().flatten().all(Option::is_none)
            && self
                .queues
                .iter()
                .all(|q| q.length == 0 && q.messages.iter().all(|m| *m == Message::EMPTY))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn zero_length_messages_still_consume_bounded_queue_slots() {
        let mut c = Channel::EMPTY;
        let h = c.start_pair().unwrap();
        c.send(0, h[0][0], b"").unwrap();
        c.send(0, h[0][0], b"").unwrap();
        assert_eq!(c.send(0, h[0][0], b""), Err(EAGAIN));
        assert_eq!(c.receive(1, h[1][1], 0), Ok(Some(Message::EMPTY)));
        c.close_process(0);
        c.close_process(1);
        assert!(c.is_clean());
    }
    #[test]
    fn only_held_capabilities_with_correct_rights_authorize_operations() {
        let mut c = Channel::EMPTY;
        let h = c.start_pair().unwrap();
        assert_eq!(c.send(0, 0, b"x"), Err(EBADF));
        assert_eq!(c.send(0, h[1][0], b"x"), Err(EBADF));
        assert_eq!(c.send(0, h[0][1], b"x"), Err(EACCES));
        assert_eq!(c.receive(0, h[0][0], 64), Err(EACCES));
        assert_eq!(c.send(2, h[0][0], b"x"), Err(EBADF));
        assert_eq!(c.receive(1, h[1][1], 64), Ok(None));
        c.send(0, h[0][0], b"hello").unwrap();
        let m = c.receive(1, h[1][1], 64).unwrap().unwrap();
        assert_eq!(&m.bytes[..m.length], b"hello");
    }
    #[test]
    fn queue_bounds_and_short_receives_do_not_discard_messages() {
        let mut c = Channel::EMPTY;
        let h = c.start_pair().unwrap();
        assert_eq!(c.send(0, h[0][0], &[1; 65]), Err(EMSGSIZE));
        c.send(0, h[0][0], b"ab").unwrap();
        c.send(0, h[0][0], b"cd").unwrap();
        assert_eq!(c.send(0, h[0][0], b"ef"), Err(EAGAIN));
        assert_eq!(c.receive(1, h[1][1], 1), Err(EMSGSIZE));
        assert_eq!(
            &c.receive(1, h[1][1], 64).unwrap().unwrap().bytes[..2],
            b"ab"
        );
        c.send(0, h[0][0], b"ef").unwrap();
        assert_eq!(
            &c.receive(1, h[1][1], 64).unwrap().unwrap().bytes[..2],
            b"cd"
        );
        assert_eq!(
            &c.receive(1, h[1][1], 64).unwrap().unwrap().bytes[..2],
            b"ef"
        );
    }
    #[test]
    fn close_discards_queued_data_and_invalidates_departed_authority() {
        let mut c = Channel::EMPTY;
        let h = c.start_pair().unwrap();
        c.send(1, h[1][0], b"secret").unwrap();
        c.close_process(1);
        assert_eq!(c.receive(0, h[0][1], 64), Err(EPIPE));
        assert_eq!(c.send(0, h[0][0], b"x"), Err(EPIPE));
        assert_eq!(c.send(1, h[1][0], b"x"), Err(EBADF));
        c.close_process(0);
        assert!(c.is_clean());
        c.close_process(0);
        assert!(c.is_clean());
    }
    #[test]
    fn revoke_and_new_lifetimes_never_resurrect_old_grants() {
        let mut c = Channel::EMPTY;
        let old = c.start_pair().unwrap();
        assert_eq!(c.revoke(0, old[0][0]), Err(EACCES));
        c.revoke(0, old[0][1]).unwrap();
        assert_eq!(c.send(1, old[1][0], b"x"), Err(EBADF));
        c.close_process(0);
        c.close_process(1);
        let new = c.start_pair().unwrap();
        assert_ne!(old, new);
        assert_eq!(c.send(0, old[0][0], b"x"), Err(EBADF));
        c.send(0, new[0][0], b"new").unwrap();
    }
    #[test]
    fn repeated_lifetimes_recover_all_channel_resources() {
        let mut c = Channel::EMPTY;
        for _ in 0..128 {
            let h = c.start_pair().unwrap();
            c.send(0, h[0][0], b"private").unwrap();
            assert_eq!(c.start_pair(), Err(EAGAIN));
            c.close_process(0);
            c.close_process(1);
            assert!(c.is_clean());
        }
    }
    #[test]
    fn token_and_generation_exhaustion_cannot_wrap() {
        let mut c = Channel::EMPTY;
        c.next_token = u64::MAX - 3;
        assert_eq!(c.start_pair(), Err(EBADF));
        assert!(c.is_clean());
        c.next_token = 1;
        c.generation = u64::MAX;
        assert_eq!(c.start_pair(), Err(EBADF));
        assert!(c.is_clean());
    }
}
