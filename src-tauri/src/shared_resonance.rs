use std::alloc::{alloc, dealloc, Layout};

/**
 * ElysiaAI // Shared Resonance Buffer (Rust side)
 * [HYBRID STAGE]
 * 
 * Manages the raw memory allocation that is shared with the Swift layer.
 * This is the ultimate level of performance for cross-language integration.
 */

pub struct SharedResonance {
    ptr: *mut u8,
    layout: Layout,
    capacity: usize,
}

impl SharedResonance {
    pub fn new(capacity: usize) -> Self {
        let layout = Layout::from_size_align(capacity, 8).unwrap();
        let ptr = unsafe { alloc(layout) };
        
        println!("[HYBRID] Allocated Shared Resonance Space: {:p}", ptr);
        
        Self {
            ptr,
            layout,
            capacity,
        }
    }

    pub fn get_raw_pointer(&self) -> *mut u8 {
        self.ptr
    }

    pub fn read_resonance(&self) -> Vec<u8> {
        unsafe {
            std::slice::from_raw_parts(self.ptr, self.capacity).to_vec()
        }
    }

    pub fn write_resonance(&self, data: &[u8]) {
        let count = std::cmp::min(data.len(), self.capacity);
        unsafe {
            std::ptr::copy_nonoverlapping(data.as_ptr(), self.ptr, count);
        }
    }
}

impl Drop for SharedResonance {
    fn drop(&mut self) {
        unsafe {
            dealloc(self.ptr, self.layout);
            println!("[HYBRID] Shared Resonance Space Neutralized.");
        }
    }
}
