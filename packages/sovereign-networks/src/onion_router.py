import hashlib
import json
import base64
from typing import List, Dict

# 🧅 Abyssal Onion Routing Simulation (Phase 170)
# "Trust is decentralized. Identity is encrypted."

class OnionNode:
    def __init__(self, node_id: str, private_key: str):
        self.node_id = node_id
        self.private_key = private_key # Simplified: Using string for mock decryption

    def decrypt_layer(self, encrypted_package: str) -> Dict:
        """
        Attempts to decrypt the outermost layer.
        If successful, returns the next hop and the nested data.
        """
        try:
            # Mock Decryption: In real Tor, this would use RSA/ECC
            raw_data = base64.b64decode(encrypted_package).decode()
            data = json.loads(raw_data)
            
            # Check if this node is the intended recipient of the layer
            if data['next_node_id'] == self.node_id:
                return data['payload']
            else:
                raise Exception("Unauthorized Node Access")
        except Exception as e:
            print(f"[NODE {self.node_id}] Decryption Error: {e}")
            return None

class OnionRouter:
    def __init__(self, nodes: List[OnionNode]):
        self.nodes = nodes

    def create_onion_package(self, final_message: string, circuit: List[OnionNode]) -> str:
        """
        Wraps the message in layers of encryption from the last node to the first.
        TRIAL & ERROR: The order must be reversed for proper peeling.
        """
        print(f"[ROUTER] Creating Onion for circuit: {[n.node_id for n in circuit]}")
        
        current_payload = final_message
        
        # We wrap from the END of the circuit to the START
        # So Node 1 peels layer 1, Node 2 peels layer 2...
        for i in range(len(circuit)-1, -1, -1):
            next_hop = "EXIT" if i == len(circuit)-1 else circuit[i+1].node_id
            
            layer = {
                "next_node_id": circuit[i].node_id,
                "payload": current_payload,
                "routing_info": f"Route to {next_hop}"
            }
            
            # Mock Encryption: Base64 wrap
            current_payload = base64.b64encode(json.dumps(layer).encode()).decode()
            print(f"  >> Wrapped Layer {i+1} for Node {circuit[i].node_id}")

        return current_payload

    def simulate_routing(self, package: str, circuit: List[OnionNode]):
        """Peels the onion as it travels through the nodes."""
        print("\n[ROUTER] Initiating Onion Routing Transmission...")
        current_package = package
        
        for i, node in enumerate(circuit):
            print(f"[HOP {i+1}] Arrived at Node: {node.node_id}")
            peeled_data = node.decrypt_layer(current_package)
            
            if peeled_data:
                print(f"[NODE {node.node_id}] Layer Peeled. Forwarding payload...")
                current_package = peeled_data
            else:
                print("🛑 [ROUTER] Circuit Broken! Decryption failed.")
                return

        print(f"SUCCESS! Final Message Delivered: {current_package}")

# --- Execution Simulation ---
if __name__ == "__main__":
    node_a = OnionNode("A", "key_a")
    node_b = OnionNode("B", "key_b")
    node_c = OnionNode("C", "key_c")
    
    router = OnionRouter([node_a, node_b, node_c])
    
    SECRET_INTEL = "ABYSSAL_PROTOCOL_X_ACTIVATED"
    circuit = [node_a, node_b, node_c]
    
    onion_pkg = router.create_onion_package(SECRET_INTEL, circuit)
    router.simulate_routing(onion_pkg, circuit)
