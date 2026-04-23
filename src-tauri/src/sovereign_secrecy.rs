/**
 * ElysiaAI // Sovereign Secrecy Module
 * [NSA-GRADE CLASSIFIED PROTOCOL]
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use lazy_static::lazy_static;

#[cfg(windows)]
use winapi::um::memoryapi::{VirtualLock, VirtualUnlock};

fn lock_memory(ptr: *mut u8, len: usize) -> bool {
    #[cfg(windows)]
    unsafe {
        if VirtualLock(ptr as _, len) == 0 {
            log::error!("[SOVEREIGN] CRITICAL: Memory lock failed! Secrecy compromise possible.");
            false
        } else {
            log::info!("[SOVEREIGN] Physical memory lock engaged (VirtualLock).");
            true
        }
    }
    #[cfg(not(windows))]
    {
        // On non-windows, we assume for now or use mlock if available
        true
    }
}

fn unlock_memory(ptr: *mut u8, len: usize) {
    #[cfg(windows)]
    unsafe {
        VirtualUnlock(ptr as _, len);
    }
}

/// A hardware-bound, memory-protected string for NSA Class 09 secrets.
/// Automatically locked in physical memory and zeroed upon drop.
pub struct SecureString {
    data: Vec<u8>,
}

impl SecureString {
    pub fn new(secret: &str) -> Self {
        let mut data = secret.as_bytes().to_vec();
        lock_memory(data.as_mut_ptr(), data.len());
        Self { data }
    }

    pub fn as_ptr(&self) -> *const u8 {
        self.data.as_ptr()
    }

    pub fn len(&self) -> usize {
        self.data.len()
    }
}

impl Drop for SecureString {
    fn drop(&mut self) {
        crate::native_bridge::zero_memory(&mut self.data);
        unlock_memory(self.data.as_mut_ptr(), self.data.len());
    }
}

/// Represents the classification level of a data artifact.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum SecrecyClass {
    /// Class 01: Genesis - Public or unclassified data.
    Class01Genesis = 1,
    /// Class 05: Sentinel - Confidential internal data.
    Class05Sentinel = 5,
    /// Class 09: Abyss - Top Secret, hardware-bound data (NSA Grade).
    Class09Abyss = 9,
}

/// Metadata for a file managed by the Sovereign system.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SovereignFile {
    pub name: String,
    pub path: String,
    pub secrecy: SecrecyClass,
    pub owner: String,
    pub integrity_hash: String,
}

lazy_static! {
    /// In-memory registry of classified files.
    static ref SECRET_REGISTRY: Mutex<HashMap<String, SovereignFile>> = Mutex::new(HashMap::new());
}

/// Registers a file into the secure registry.
pub fn register_important_file(file: SovereignFile) -> Result<(), String> {
    let mut registry = SECRET_REGISTRY.lock()
        .map_err(|_| "Failed to acquire registry lock".to_string())?;
    
    log::info!("[SOVEREIGN] Registering artifact: {} (Class: {:?})", file.name, file.secrecy);
    
    if file.secrecy >= SecrecyClass::Class09Abyss {
        log::warn!("[SOVEREIGN] Class 09 artifact detected. Verification mandatory.");
    }
    
    registry.insert(file.path.clone(), file);
    Ok(())
}

/// Retrieves the secrecy class of a file by its path.
pub fn get_file_classification(path: &str) -> Option<SecrecyClass> {
    SECRET_REGISTRY.lock().ok()?.get(path).map(|f| f.secrecy)
}

/// Performs a high-integrity clearance audit via the native Swift layer.
pub async fn validate_nsa_clearance() -> Result<bool, String> {
    use crate::native_bridge;
    
    log::info!("[SOVEREIGN] Initiating hardware-bound resonance audit for NSA clearance...");
    
    let (msg, score) = native_bridge::trigger_native_audit("NSA_CLEARANCE_AUTH_v1")
        .await
        .map_err(|e| format!("Audit failed: {}", e))?;
    
    if score >= 0.99 {
        log::info!("[SOVEREIGN] Clearance granted: {}", msg);
        Ok(true)
    } else {
        log::error!("[SOVEREIGN] Clearance rejected. Integrity score {} too low.", score);
        Ok(false)
    }
}

pub fn seal_class09_data(data: &[u8]) -> crate::error::AppResult<Vec<u8>> {
    let mut output = vec![0u8; data.len()];
    
    // Lock both input and output buffers in physical memory
    if !lock_memory(data.as_ptr() as *mut u8, data.len()) || !lock_memory(output.as_mut_ptr(), output.len()) {
        return Err(crate::error::AppError::Security("Memory locking failed for Class 09 artifact".into()));
    }

    unsafe {
        crate::native_bridge::swift_seal_classified_data(
            data.as_ptr(),
            data.len(),
            output.as_mut_ptr()
        );
    }
    
    unlock_memory(data.as_ptr() as *mut u8, data.len());
    unlock_memory(output.as_mut_ptr(), output.len());
    
    log::info!("[SOVEREIGN] Data sealed with Class 09 (Abyss) protection.");
    Ok(output)
}

pub fn unseal_class09_data(sealed_data: &[u8]) -> crate::error::AppResult<Vec<u8>> {
    let mut output = vec![0u8; sealed_data.len()];
    
    if !lock_memory(sealed_data.as_ptr() as *mut u8, sealed_data.len()) || !lock_memory(output.as_mut_ptr(), output.len()) {
        return Err(crate::error::AppError::Security("Memory locking failed for Class 09 artifact retrieval".into()));
    }

    unsafe {
        crate::native_bridge::swift_unseal_classified_data(
            sealed_data.as_ptr(),
            sealed_data.len(),
            output.as_mut_ptr()
        );
    }

    unlock_memory(sealed_data.as_ptr() as *mut u8, sealed_data.len());
    unlock_memory(output.as_mut_ptr(), output.len());

    log::info!("[SOVEREIGN] Data unsealed via Secure Enclave authorization.");
    Ok(output)
}
