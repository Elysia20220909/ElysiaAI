import os
import random
import shutil
import logging

logger = logging.getLogger("AbyssalScatter")

# Innocuous folder names for deep nesting
SYSTEM_FOLDERS = [
    "cache", "temp", "logs", "auth", "metadata", "registry", "drivers", "resources",
    "v1.0", "v1.1", "v1.2", "sync", "deployment", "local_storage", "internal", "backup",
    "0x7F", "0x4A", "0xDE", "0xAD", "bin", "lib", "config", "staging", "telemetry"
]

def create_deep_path(base_root, depth=5):
    """Creates a random deep path and returns it."""
    current_path = base_root
    for _ in range(depth):
        folder_name = random.choice(SYSTEM_FOLDERS)
        current_path = os.path.join(current_path, folder_name)
    
    os.makedirs(current_path, exist_ok=True)
    return current_path

def scatter_fragments(fragment_paths, base_root, depth=6):
    """
    Scatters a list of fragment files into a deep, random directory structure.
    Returns a mapping of fragment name to its deep path.
    """
    scatter_map = {}
    
    for frag_path in fragment_paths:
        frag_name = os.path.basename(frag_path)
        # Create a unique deep path for each fragment or shared paths
        deep_dir = create_deep_path(base_root, depth=depth)
        new_path = os.path.join(deep_dir, frag_name)
        
        # Move fragment
        shutil.move(frag_path, new_path)
        scatter_map[frag_name] = new_path
        logger.info(f"Fragment {frag_name} submerged into {new_path}")
        
    return scatter_map
