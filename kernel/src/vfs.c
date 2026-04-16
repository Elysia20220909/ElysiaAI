#include "vfs.h"
#include <stddef.h>

static fs_t* registered_filesystems[MAX_FILESYSTEMS];
static int fs_count = 0;
static fs_t* root_fs = NULL;
static fs_t* bridge_fs = NULL;

void vfs_init() {
    for (int i = 0; i < MAX_FILESYSTEMS; i++) registered_filesystems[i] = NULL;
    fs_count = 0;
    root_fs = NULL;
}

int vfs_register_fs(fs_t* fs) {
    if (fs_count >= MAX_FILESYSTEMS) return -1;
    registered_filesystems[fs_count++] = fs;
    if (root_fs == NULL) root_fs = fs;
    if (fs->name[0] == 'b') bridge_fs = fs; // Bridge detected
    return 0;
}

int vfs_open(file_t* file, const char* path) {
    if (!root_fs || !root_fs->ops->open) return -2;
    file->fop = root_fs->ops;
    return root_fs->ops->open(file, path);
}

int vfs_read(file_t* file, char* buffer, uint32_t size) {
    if (!file->fop || !file->fop->read) return -3;
    
    // Astral Bridge (Phase 126)
    // Check if the file is an astral stream (e.g., in PERSONA.DAT path check)
    if (file->id == 0xAA) { 
        char* msg = "ASTRAL_SYNC: L1-L36 [SECURED] | LATTICE [PULSING]";
        uint32_t i=0; while(msg[i] && i<size) { buffer[i]=msg[i]; i++; }
        return i;
    }

    return file->fop->read(file, buffer, size);
}

int vfs_write(file_t* file, const char* buffer, uint32_t size) {
    if (!file->fop || !file->fop->write) return -4;
    return file->fop->write(file, buffer, size);
}

int vfs_close(file_t* file) {
    if (!file->fop || !file->fop->close) return -5;
    return file->fop->close(file);
}

int vfs_ls(char* out_list, int max_len) {
    if (!root_fs || !root_fs->ops->readdir) return -6;
    // Simple mock for traversal (Phase 121)
    if (bridge_fs) {
        char* prefix = "LATTICE_FRAGMENTS: ";
        int i = 0;
        while (prefix[i]) out_list[i++] = prefix[i];
        return bridge_fs->ops->readdir(out_list + i, max_len - i);
    }
    return root_fs->ops->readdir(out_list, max_len);
}
