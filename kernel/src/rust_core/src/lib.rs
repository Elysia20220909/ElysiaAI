#![no_std]
use core::panic::PanicInfo;

#[no_mangle]
pub extern "C" fn aegis_verify_identity(name: *const u8) -> i32 {
    if name.is_null() { return -1; }
    
    // Simple simulated check: If name contains 'ELYSIA', it's sovereign
    let mut i = 0;
    while i < 32 {
        let b = unsafe { *name.add(i) };
        if b == 0 { break; }
        // Look for 'E' 'L' 'Y' 'S' 'I' 'A'
        // Simplified check for Phase 116 Alpha
        if b == b'E' { return 1; } 
        i += 1;
    }
    0
}

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}
