#ifndef VFS_H
#define VFS_H

#include <stdint.h>

#define MAX_PATH 256
#define MAX_FILESYSTEMS 4

typedef struct file_handle {
    char name[MAX_PATH];
    uint32_t size;
    uint32_t offset;
    void* internal_data; // Pointer to filesystem-specific handle
    struct file_operations* fop;
} file_t;

typedef struct file_operations {
    int (*open)(file_t* file, const char* path);
    int (*read)(file_t* file, char* buffer, uint32_t size);
    int (*write)(file_t* file, const char* buffer, uint32_t size);
    int (*close)(file_t* file);
    int (*readdir)(char* out_list, int max_len);
} file_ops_t;

typedef struct filesystem {
    const char* name;
    file_ops_t* ops;
} fs_t;

// VFS Switchboard
void vfs_init();
int vfs_register_fs(fs_t* fs);
int vfs_open(file_t* file, const char* path);
int vfs_read(file_t* file, char* buffer, uint32_t size);
int vfs_write(file_t* file, const char* buffer, uint32_t size);
int vfs_close(file_t* file);
int vfs_ls(char* out_list, int max_len);

#endif
