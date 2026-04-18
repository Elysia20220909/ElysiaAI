CC = clang
ASM = nasm
CFLAGS = -target x86_64-unknown-windows -ffreestanding -fno-stack-protector -fno-stack-check -fshort-wchar -mno-red-zone -Iinclude -O2
LDFLAGS = -target x86_64-unknown-windows -nostdlib -Wl,-entry:efi_main -Wl,-subsystem:efi_application -fuse-ld=lld-link -Wl,-filealign:4096

ASM_SRC = src/interrupts.asm
C_SRC = boot/bootloader.c src/graphics.c src/memory.c src/paging.c src/interrupts.c src/task.c src/keyboard.c src/mouse.c src/compositor.c src/ata.c src/fat32.c src/vfs.c src/gdt.c src/syscall.c
ASM_OBJ = interrupts.o
BOOT_EFI = BOOTX64.EFI
BOOT_IMG = elysia_os.img
BOOT_VMDK = elysia_os.vmdk
BOOT_VMX = elysia_os.vmx
RUST_LIB = src/rust_core/target/x86_64-pc-windows-gnullvm/release/librust_core.a

all: $(BOOT_VMDK) $(BOOT_ISO) $(BOOT_IMG) $(BOOT_VMX)

$(ASM_OBJ): $(ASM_SRC)
	$(ASM) -f win64 -o $@ $<

$(BOOT_EFI): $(C_SRC) $(ASM_OBJ) rust_lib
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $(C_SRC) $(ASM_OBJ) $(RUST_LIB)

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

$(BOOT_VMDK): $(BOOT_IMG)
	qemu-img convert -f raw -O vmdk $(BOOT_IMG) $@

$(BOOT_ISO): $(BOOT_IMG)
	mkdir -p iso_root/EFI/BOOT
	cp $(BOOT_EFI) iso_root/EFI/BOOT/BOOTX64.EFI
	xorriso -as mkisofs -R -f -e $(BOOT_IMG) -no-emul-boot -o $@ iso_root
	rm -rf iso_root

$(BOOT_VMX):
	echo '.encoding = "UTF-8"' > $@
	echo 'config.version = "8"' >> $@
	echo 'virtualHW.version = "22"' >> $@
	echo 'memsize = "32768"' >> $@
	echo 'numvcpus = "16"' >> $@
	echo 'cpuid.coresPerSocket = "16"' >> $@
	echo 'guestOS = "other-64"' >> $@
	echo 'firmware = "efi"' >> $@
	echo 'ide0:0.present = "TRUE"' >> $@
	echo 'ide0:0.fileName = "elysia_os.vmdk"' >> $@
	echo 'ide0:0.deviceType = "disk"' >> $@
	echo 'pciBridge0.present = "TRUE"' >> $@
	echo 'pciBridge4.present = "TRUE"' >> $@
	echo 'pciBridge5.present = "TRUE"' >> $@
	echo 'pciBridge6.present = "TRUE"' >> $@
	echo 'pciBridge7.present = "TRUE"' >> $@
	echo 'floppy0.present = "FALSE"' >> $@
	echo 'mks.enable3d = "TRUE"' >> $@
	echo 'svga.vramSize = "2147483648"' >> $@
	echo 'svga.graphicsMemoryKB = "2097152"' >> $@
	echo 'gui.exitOnLastVMClosing = "FALSE"' >> $@
	echo 'displayName = "Elysia Sovereign OS PRO"' >> $@
	echo 'cleanShutdown = "FALSE"' >> $@
	echo 'softPowerOff = "FALSE"' >> $@

clean:
	rm -f $(BOOT_EFI) $(BOOT_IMG) $(BOOT_VMDK) $(BOOT_ISO) $(BOOT_VMX) $(ASM_OBJ) SOVEREIGN.TXT SENTINEL.KEY

run: $(BOOT_VMDK)
	qemu-system-x86_64 -bios ovmf/OVMF_CODE.fd -drive file=$(BOOT_VMDK),format=vmdk -net none
