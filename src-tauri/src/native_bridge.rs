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
}

pub fn trigger_native_audit(resonance_key: &str) -> Result<(String, f64), String> {
    println!("[RUST] Relaying Audit Request to Swift via Secure FFI...");
    
    let c_key = CString::new(resonance_key).map_err(|e| e.to_string())?;
    
    unsafe {
        // Execute the cross-language call
        let response = swift_perform_resonance_audit(c_key.as_ptr());
        
        if response.success {
            let msg = CStr::from_ptr(response.message).to_string_lossy().into_owned();
            // Important: We must ensure the message pointer is handled correctly if Swift allocated it
            Ok((msg, response.integrity_score))
        } else {
            Err("Native Audit Failed in Swift Layer".into())
        }
    }
}

pub fn secure_shutdown() {
    println!("[RUST] Triggering Secure Shutdown of Native Layer...");
    unsafe {
        swift_clear_secure_enclave();
    }
}
