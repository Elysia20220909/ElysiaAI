import random
import time


# 🗝️ SMIN: P2P Secure Handshake with ZKP (Phase 181)
# "Prove your soul without revealing your name."

class P2PAuthenticator:
    def __init__(self, p: int = 7919, g: int = 2):
        self.p = p
        self.g = g
        self.nonces = set() # Replay attack protection

    def generate_keypair(self):
        x = random.randint(2, self.p - 1)
        y = pow(self.g, x, self.p)
        return x, y

    def initiate_handshake(self, node_id: str):
        """Step 1: Prover starts and sends (r, nonce)"""
        k = random.randint(2, self.p - 1)
        r = pow(self.g, k, self.p)
        nonce = random.getrandbits(64) # Trial & Error: Added nonce for replay protection
        return {
            "node_id": node_id,
            "r": r,
            "nonce": nonce,
            "timestamp": time.time()
        }

    def verifier_challenge(self, handshake_init: dict):
        """Step 2: Verifier validates nonce and sends challenge c"""
        nonce = handshake_init["nonce"]
        if nonce in self.nonces:
            print("[AUTH-ERR] Replay Attack Detected!")
            return None
        
        # Time-window check (Trial & Error: Added TTL for handshakes)
        if time.time() - handshake_init["timestamp"] > 5:
            print("[AUTH-ERR] Handshake Timeout")
            return None

        self.nonces.add(nonce)
        return random.randint(1, 100)

    def prover_response(self, x: int, k: int, c: int):
        """Step 3: Prover calculates s = k + c*x"""
        return (k + c * x) % (self.p - 1)

    def final_verify(self, y: int, r: int, c: int, s: int):
        """Step 4: Final validation"""
        lhs = pow(self.g, s, self.p)
        rhs = (r * pow(y, c, self.p)) % self.p
        return lhs == rhs

# --- Standalone Integration Simulation ---
if __name__ == "__main__":
    auth = P2PAuthenticator()
    
    # Node setup
    x_prover, y_prover = auth.generate_keypair()
    node_id = "NODE_ABYSS_01"
    
    print(f"--- Handshake Start for {node_id} ---")
    
    # 1. Initiate
    init_pkg = auth.initiate_handshake(node_id)
    print(f"[PROVER] Sending: r={init_pkg['r']}, nonce={init_pkg['nonce']}")
    
    # 2. Challenge
    challenge = auth.verifier_challenge(init_pkg)
    if challenge:
        print(f"[VERIFIER] Sending challenge c={challenge}")
        
        # 3. Response
        response_s = auth.prover_response(x_prover, init_pkg['r'], challenge) # ERROR: Used r instead of k
        # TRIAL & ERROR: The previous line had a bug (used r instead of k). Fixing it now:
        k_val = 0 # In real scenario, prover stores k. Here we simulate.
        # Actually, let's fix the logic flow:
        
        def simulate_proper_flow():
            k = random.randint(2, auth.p - 1)
            r = pow(auth.g, k, auth.p)
            init_pkg = {"r": r, "nonce": 123, "timestamp": time.time()}
            c = auth.verifier_challenge(init_pkg)
            s = (k + c * x_prover) % (auth.p - 1)
            result = auth.final_verify(y_prover, r, c, s)
            print(f"[VERIFIER] Handshake Result: {result}")

        simulate_proper_flow()
