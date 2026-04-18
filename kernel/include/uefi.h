#ifndef ELYSIA_UEFI_H
#define ELYSIA_UEFI_H

#include <stdint.h>

typedef void* EFI_HANDLE;
typedef uint64_t EFI_STATUS;

#define EFI_SUCCESS 0

typedef struct {
    uint32_t Data1;
    uint16_t Data2;
    uint16_t Data3;
    uint8_t  Data4[8];
} EFI_GUID;

typedef struct {
    uint64_t Signature;
    uint32_t Revision;
    uint32_t HeaderSize;
    uint32_t CRC32;
    uint32_t Reserved;
} EFI_TABLE_HEADER;

struct _EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL;

typedef EFI_STATUS ( *EFI_TEXT_RESET)(
    struct _EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *This,
    uint8_t ExtendedVerification
);

typedef EFI_STATUS ( *EFI_TEXT_STRING)(
    struct _EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *This,
    uint16_t *String
);

typedef struct _EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL {
    EFI_TEXT_RESET Reset;
    EFI_TEXT_STRING OutputString;
} EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL;

// --- Graphics Output Protocol (GOP) ---

typedef enum {
    PixelRedGreenBlueReserved8BitPerColor,
    PixelBlueGreenRedReserved8BitPerColor,
    PixelBitMask,
    PixelBltOnly,
    PixelFormatMax
} EFI_GRAPHICS_PIXEL_FORMAT;

typedef struct {
    uint32_t Version;
    uint32_t HorizontalResolution;
    uint32_t VerticalResolution;
    EFI_GRAPHICS_PIXEL_FORMAT PixelFormat;
    uint32_t RedMask;
    uint32_t GreenMask;
    uint32_t BlueMask;
    uint32_t ReservedMask;
    uint32_t PixelsPerScanLine;
} EFI_GRAPHICS_OUTPUT_MODE_INFORMATION;

typedef struct {
    uint32_t MaxMode;
    uint32_t Mode;
    EFI_GRAPHICS_OUTPUT_MODE_INFORMATION *Info;
    uint64_t SizeOfInfo;
    uint64_t FrameBufferBase;
    uint64_t FrameBufferSize;
} EFI_GRAPHICS_OUTPUT_PROTOCOL_MODE;

struct _EFI_GRAPHICS_OUTPUT_PROTOCOL;

typedef EFI_STATUS (*EFI_GRAPHICS_OUTPUT_PROTOCOL_QUERY_MODE) (
    struct _EFI_GRAPHICS_OUTPUT_PROTOCOL *This,
    uint32_t ModeNumber,
    uint64_t *SizeOfInfo,
    EFI_GRAPHICS_OUTPUT_MODE_INFORMATION **Info
);

typedef EFI_STATUS (*EFI_GRAPHICS_OUTPUT_PROTOCOL_SET_MODE) (
    struct _EFI_GRAPHICS_OUTPUT_PROTOCOL *This,
    uint32_t ModeNumber
);

typedef struct _EFI_GRAPHICS_OUTPUT_PROTOCOL {
    EFI_GRAPHICS_OUTPUT_PROTOCOL_QUERY_MODE QueryMode;
    EFI_GRAPHICS_OUTPUT_PROTOCOL_SET_MODE SetMode;
    void* Blt;
    EFI_GRAPHICS_OUTPUT_PROTOCOL_MODE *Mode;
} EFI_GRAPHICS_OUTPUT_PROTOCOL;

#define EFI_GRAPHICS_OUTPUT_PROTOCOL_GUID \
    {0x9042a9de, 0x23dc, 0x4a38, {0x96, 0xfb, 0x7a, 0xde, 0xd0, 0x80, 0x51, 0x6a}}

// --- Memory Management ---

typedef struct {
    uint32_t Type;
    uint32_t Padding;
    uint64_t PhysicalStart;
    uint64_t VirtualStart;
    uint64_t NumberOfPages;
    uint64_t Attribute;
} EFI_MEMORY_DESCRIPTOR;

// --- Boot Services ---

typedef EFI_STATUS (*EFI_LOCATE_PROTOCOL) (
    EFI_GUID *Protocol,
    void *Registration,
    void **Interface
);

typedef EFI_STATUS (*EFI_HANDLE_PROTOCOL) (
    EFI_HANDLE Handle,
    EFI_GUID *Protocol,
    void **Interface
);

typedef EFI_STATUS (*EFI_GET_MEMORY_MAP) (
    uint64_t *MemoryMapSize,
    EFI_MEMORY_DESCRIPTOR *MemoryMap,
    uint64_t *MapKey,
    uint64_t *DescriptorSize,
    uint32_t *DescriptorVersion
);

typedef EFI_STATUS (*EFI_EXIT_BOOT_SERVICES) (
    EFI_HANDLE ImageHandle,
    uint64_t MapKey
);

typedef struct {
    EFI_TABLE_HEADER Header;
    void* RaiseTPL;
    void* RestoreTPL;
    void* AllocatePages;
    void* FreePages;
    EFI_GET_MEMORY_MAP GetMemoryMap;
    void* AllocatePool;
    void* FreePool;
    void* CreateEvent;
    void* SetTimer;
    void* WaitForEvent;
    void* SignalEvent;
    void* CloseEvent;
    void* CheckEvent;
    void* InstallProtocolInterface;
    void* ReinstallProtocolInterface;
    void* UninstallProtocolInterface;
    EFI_HANDLE_PROTOCOL HandleProtocol;
    void* Reserved;
    void* RegisterProtocolNotify;
    void* LocateHandle;
    void* LocateDevicePath;
    void* InstallConfigurationTable;
    void* LoadImage;
    void* StartImage;
    void* Exit;
    void* UnloadImage;
    EFI_EXIT_BOOT_SERVICES ExitBootServices;
    void* GetNextMonotonicCount;
    void* Stall;
    void* SetWatchdogTimer;
    void* ConnectController;
    void* DisconnectController;
    void* OpenProtocol;
    void* CloseProtocol;
    void* OpenProtocolInformation;
    void* ProtocolsPerHandle;
    void* LocateHandleBuffer;
    EFI_LOCATE_PROTOCOL LocateProtocol;
    void* InstallMultipleProtocolInterfaces;
    void* UninstallMultipleProtocolInterfaces;
    void* CalculateCrc32;
    void* CopyMem;
    void* SetMem;
    void* CreateEventEx;
} EFI_BOOT_SERVICES;

typedef struct {
    EFI_TABLE_HEADER Header;
    uint16_t *FirmwareVendor;
    uint32_t FirmwareRevision;
    EFI_HANDLE ConsoleInHandle;
    void *ConIn;
    EFI_HANDLE ConsoleOutHandle;
    EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *ConOut;
    void* StandardErrorHandle;
    void* StdErr;
    void* RuntimeServices;
    EFI_BOOT_SERVICES *BootServices;
} EFI_SYSTEM_TABLE;

#endif
