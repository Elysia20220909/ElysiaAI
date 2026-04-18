CC = clang
ASM = nasm
CFLAGS = -target x86_64-unknown-windows -ffreestanding -fno-stack-protector -fno-stack-check -fshort-wchar -mno-red-zone -Iinclude -O2
LDFLAGS = -target x86_64-unknown-windows -nostdlib -Wl,-entry:efi_main -Wl,-subsystem:efi_application -fuse-ld=lld-link -Wl,-filealign:4096 -Lsrc/rust_core/target/x86_64-pc-windows-gnullvm/release -lrust_core

ASM_SRC = src/interrupts.asm
C_SRC = boot/bootloader.c src/graphics.c src/memory.c src/paging.c src/interrupts.c src/task.c src/keyboard.c src/mouse.c src/compositor.c src/ata.c src/fat32.c src/vfs.c src/gdt.c src/syscall.c
ASM_OBJ = interrupts.o
BOOT_EFI = BOOTX64.EFI
BOOT_IMG = elysia_os.img
BOOT_ISO = elysia_os.iso

all: $(BOOT_ISO)

$(ASM_OBJ): $(ASM_SRC)
	$(ASM) -f win64 -o $@ $<

$(BOOT_EFI): $(C_SRC) $(ASM_OBJ) rust_lib
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $(C_SRC) $(ASM_OBJ)

rust_lib:
	cd src/rust_core && cargo build --release --target x86_64-pc-windows-gnullvm

$(BOOT_IMG): $(BOOT_EFI)
	dd if=/dev/zero of=$@ bs=1M count=64
	mkfs.vfat $@
	mmd -i $@ ::/EFI
	mmd -i $@ ::/EFI/BOOT
	mcopy -i $@ $(BOOT_EFI) ::/EFI/BOOT/BOOTX64.EFI
	echo "ELYSIOS DATA SOVEREIGNTY ACHIEVED." > SOVEREIGN.TXT
	mcopy -i $@ SOVEREIGN.TXT ::/SOVEREIGN.TXT
	echo "AEGIS-SVR-777" > SENTINEL.KEY
	mcopy -i $@ SENTINEL.KEY ::/SENTINEL.KEY

$(BOOT_ISO): $(BOOT_IMG) $(BOOT_EFI)
	mkdir -p iso_root/EFI/BOOT
	cp $(BOOT_EFI) iso_root/EFI/BOOT/BOOTX64.EFI
	echo "ELYSIOS DATA SOVEREIGNTY ACHIEVED." > iso_root/SOVEREIGN.TXT
	echo "AEGIS-SVR-777" > iso_root/SENTINEL.KEY
	cp $(BOOT_IMG) iso_root/
	xorriso -as mkisofs -R -J -v -V "ELYSIA_OS" -e elysia_os.img -no-emul-boot -isohybrid-gpt-basdat -o $@ iso_root/

clean:
	rm -f $(BOOT_EFI) $(BOOT_IMG) $(BOOT_ISO) $(ASM_OBJ) SOVEREIGN.TXT SENTINEL.KEY
	rm -rf iso_root/

run: $(BOOT_ISO)
	qemu-system-x86_64 -bios ovmf/OVMF_CODE.fd -cdrom $(BOOT_ISO) -net none
