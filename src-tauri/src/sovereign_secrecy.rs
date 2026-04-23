/**
 * ElysiaAI // Sovereign Secrecy Module
 * [NSA-GRADE CLASSIFIED PROTOCOL]
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use lazy_static::lazy_static;

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
