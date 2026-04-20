import random


# ELYSIA SOVEREIGN DEEP NET
# Phase 116: Deep NET Manifestation
# Based on the Barabási-Albert (BA) Scale-Free Network Model.


class DeepNetNode:
    def __init__(self, node_id, security_level=1):
        self.node_id = node_id
        self.security_level = security_level
        self.neighbors = []
        self.is_compromised = False
        self.node_type = "EDGE"  # HUB or EDGE

    def add_neighbor(self, neighbor):
        if neighbor not in self.neighbors:
            self.neighbors.append(neighbor)


class SovereignDeepNet:
    def __init__(self, initial_nodes=3, total_nodes=15):
        self.nodes = {}
        self.generate_topology(initial_nodes, total_nodes)

    def generate_topology(self, m0, n):
        """
        Barabási-Albert model: Preferential attachment.
        """
        # Initial complete graph
        for i in range(m0):
            self.nodes[i] = DeepNetNode(i, security_level=random.randint(1, 3))

        for i in range(m0):
            for j in range(i + 1, m0):
                self.nodes[i].add_neighbor(self.nodes[j])
                self.nodes[j].add_neighbor(self.nodes[i])

        # Add new nodes
        for i in range(m0, n):
            new_node = DeepNetNode(i, security_level=random.randint(1, 5))
            self.nodes[i] = new_node

            # Preferential attachment
            targets = self.get_preferential_targets(m=2)
            for target_id in targets:
                self.nodes[i].add_neighbor(self.nodes[target_id])
                self.nodes[target_id].add_neighbor(self.nodes[i])

        # Identify HUBs (nodes with high degree)
        for node in self.nodes.values():
            if len(node.neighbors) > 4:
                node.node_type = "HUB"
                node.security_level += 3

    def get_preferential_targets(self, m):
        all_nodes = list(self.nodes.keys())
        degrees = [len(self.nodes[n].neighbors) for n in all_nodes]
        total_degree = sum(degrees)
        probs = [d / total_degree for d in degrees]

        targets = []
        while len(targets) < m:
            target = random.choices(all_nodes, weights=probs, k=1)[0]
            if target not in targets:
                targets.append(target)
        return targets

    def scan_network(self):
        print("\033[1;36m[SCAN] Mapping Local Deep NET Topology...\033[0m")
        for node_id, node in self.nodes.items():
            type_color = "\033[1;31m" if node.node_type == "HUB" else "\033[1;32m"
            print(
                f"  Node {node_id:02d} | {type_color}{node.node_type}\033[0m | Sec: {node.security_level} | Links: {len(node.neighbors)}"
            )
        print("\033[1;36m[SCAN] Complete. Found hubs in Arasaka/Militech sectors.\033[0m")


if __name__ == "__main__":
    net = SovereignDeepNet()
    net.scan_network()
