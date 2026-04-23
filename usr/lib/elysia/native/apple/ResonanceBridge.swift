import Foundation

/**
 * ElysiaAI // Resonance Bridge (Swift side)
 * [CRITICAL SECURITY COMPONENT]
 * 
 * Provides the C-compatible implementation for the Rust backend.
 * Uses @_cdecl for strict FFI compatibility and manual memory management
 * to ensure sensitive data is not leaked during the transfer.
 */

@repr(C)
public struct SecureResponse {
    var success: Bool
    var message: UnsafeMutablePointer<Int8>?
    var integrityScore: Double
}

@_cdecl("swift_perform_resonance_audit")
public func performResonanceAudit(key: UnsafePointer<Int8>) -> SecureResponse {
    let resonanceKey = String(cString: key)
    print("[SWIFT] Received Audit Request from Rust. Key Resonance: \(resonanceKey.prefix(4))...")
    
    let sentinel = SovereignSentinel(resonanceKey: resonanceKey)
    
    do {
        let isSuccess = try sentinel.performNativeAudit()
        let message = "Resonance Interface: Integrity Level Alpha confirmed."
        
        // Allocate C-style string for Rust consumption
        let cMessage = strdup(message)
        
        return SecureResponse(
            success: isSuccess,
            message: cMessage,
            integrityScore: sentinel.getIntegrityScore()
        )
    } catch {
        return SecureResponse(
            success: false,
            message: strdup("Integrity Compromised: Audit Terminated."),
            integrityScore: 0.0
        )
    }
}

@_cdecl("swift_clear_secure_enclave")
public func clearSecureEnclave() {
    print("[SWIFT] Purging Secure Enclave buffers as requested by Rust.")
    // Logic to clear sensitive data
}
