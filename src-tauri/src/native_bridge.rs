use std::ffi::{CStr, CString};
use std::os::raw::c_char;

/**
 * ElysiaAI // Native Bridge (Rust side)
 * [CRITICAL SECURITY COMPONENT]
 * 
 * This module handles the secure FFI (Foreign Function Interface) between 
 * the Rust backend and the Swift native layer.
 */

#[repr(C)]
pub struct SecureResponse {
    pub success: bool,
    pub message: *mut c_char,
    pub integrity_score: f64,
}

extern "C" {
    // These functions are implemented in Swift
    fn swift_perform_resonance_audit(key: *const c_char) -> SecureResponse;
    fn swift_clear_secure_enclave();
    fn swift_zero_secure_buffer(buffer: *mut std::ffi::c_void, length: usize);
    fn swift_seal_classified_data(data_ptr: *const u8, data_len: usize, output_ptr: *mut u8) -> usize;
    fn swift_unseal_classified_data(sealed_ptr: *const u8, sealed_len: usize, output_ptr: *mut u8) -> usize;
    
    // Physics Resonance (Swift)
    pub fn swift_calculate_gravity_resonance(y: f32, velocity_y: f32) -> f32;
    pub fn swift_calculate_wind_resonance(x: f32, force: f32) -> f32;
}

pub async fn trigger_native_audit(resonance_key: &str) -> Result<(String, f64), String> {
    println!("[RUST] Relaying Audit Request to Swift via Secure FFI...");
    
    let c_key = CString::new(resonance_key).map_err(|e| e.to_string())?;
    
    // We wrap this in a blocking task if it's long running, 
    // but for now we keep it simple.
    let response = unsafe { swift_perform_resonance_audit(c_key.as_ptr()) };
    
    if response.success {
        let msg = unsafe { 
            let c_str = CStr::from_ptr(response.message);
            let s = c_str.to_string_lossy().into_owned();
            
            // Free the memory allocated by strdup in Swift
            libc::free(response.message as *mut libc::c_void);
            s
        };
        Ok((msg, response.integrity_score))
    } else {
        Err("Native Audit Failed in Swift Layer".into())
    }
}

pub fn zero_memory(buffer: &mut [u8]) {
    unsafe {
        swift_zero_secure_buffer(buffer.as_mut_ptr() as *mut std::ffi::c_void, buffer.len());
    }
}

pub fn secure_shutdown() {
    println!("[RUST] Triggering Secure Shutdown of Native Layer...");
    unsafe {
        swift_clear_secure_enclave();
    }
}
