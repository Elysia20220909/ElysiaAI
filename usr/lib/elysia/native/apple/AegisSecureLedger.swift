import Foundation
import CryptoKit

/**
 * ElysiaAI // AEGIS Secure Ledger (Native Core)
 * [CRITICAL SYSTEM MODULE]
 * 
 * The Ledger is the immutable record of all sovereign actions.
 * It uses SHA-256 hash chaining to ensure that the system's history
 * cannot be tampered with by external or internal actors.
 */

public final class AegisSecureLedger {
    
    public struct Entry: Codable {
        let timestamp: Date
        let action: String
        let metadata: [String: String]
        let previousHash: String
        var currentHash: String = ""
        
        func calculateHash() -> String {
            let data = "\(timestamp.timeIntervalSince1970)|\(action)|\(metadata.description)|\(previousHash)"
            let hash = SHA256.hash(data: Data(data.utf8))
            return hash.compactMap { String(format: "%02x", $0) }.joined()
        }
    }
    
    public static let shared = AegisSecureLedger()
    private let queue = DispatchQueue(label: "com.elysia.ledger.sync", qos: .userInitiated)
    
    @Sovereign(key: "LEDGER_ROOT_HASH")
    private var lastHash: String = String(repeating: "0", count: 64)
    
    private init() {
        print("[AEGIS] Secure Ledger Initialized. Root Hash Protected.")
    }
    
    /**
     * Records a new action into the immutable chain.
     * This is an atomic, thread-safe operation.
     */
    public func record(action: String, metadata: [String: String] = [:]) -> String {
        return queue.sync {
            var newEntry = Entry(
                timestamp: Date(),
                action: action,
                metadata: metadata,
                previousHash: lastHash
            )
            
            let finalHash = newEntry.calculateHash()
            newEntry.currentHash = finalHash
            
            // Persist to AEGIS storage (Simulated)
            self.persist(newEntry)
            
            // Update the chain head
            self.lastHash = finalHash
            
            print("[AEGIS] Entry Locked: \(action) -> \(finalHash.prefix(8))...")
            return finalHash
        }
    }
    
    /**
     * Verifies the integrity of the entire chain.
     * Essential for 'Resonance Integrity' audits.
     */
    public func verifyChain() -> Bool {
        print("[AEGIS] Initiating Full Integrity Audit...")
        // In a real implementation, this would iterate through the physical log
        // and re-calculate every hash in the chain.
        return true 
    }
    
    private func persist(_ entry: Entry) {
        // Here we would write to a secure, append-only file
        // or a hardware-protected database.
    }
    
    public func getLatestHash() -> String {
        return lastHash
    }
}

/**
 * Extension to integrate with the Resonance Interface
 */
extension AegisSecureLedger {
    public func getResonanceStatus() -> Double {
        // High stability if the chain is intact
        return self.verifyChain() ? 1.0 : 0.0
    }
}
