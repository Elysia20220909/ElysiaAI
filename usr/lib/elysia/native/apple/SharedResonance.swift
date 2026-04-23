import Foundation

/**
 * ElysiaAI // Shared Resonance Buffer (Swift side)
 * [HYBRID STAGE]
 * 
 * This module enables zero-copy memory sharing between Swift and Rust.
 * It is the "Next Stage" of their integration, where the two languages
 * share a single, sovereign memory space for high-speed resonance.
 */

public final class SharedResonanceBuffer {
    
    private let rawPointer: UnsafeMutableRawPointer
    private let capacity: Int
    
    /**
     * Initializes the buffer from a pointer provided by the Rust backend.
     */
    public init(pointer: UnsafeMutableRawPointer, capacity: Int) {
        self.rawPointer = pointer
        self.capacity = capacity
        print("[HYBRID] Resonance Buffer Linked at: \(rawPointer)")
    }
    
    /**
     * Writes a 'Resonance Signal' into the shared space.
     */
    public func broadcastSignal(_ signal: [UInt8]) {
        let count = min(signal.count, capacity)
        rawPointer.copyMemory(from: signal, byteCount: count)
        print("[HYBRID] Signal Broadcasted to Rust layer.")
    }
    
    /**
     * Reads a signal from the shared space.
     */
    public func receiveSignal() -> [UInt8] {
        let bufferPointer = rawPointer.bindMemory(to: UInt8.self, capacity: capacity)
        return Array(UnsafeBufferPointer(start: bufferPointer, count: capacity))
    }
}
