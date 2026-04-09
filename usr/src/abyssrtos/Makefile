# 🧧 ABYSS_RTOS BUILD_ORCHESTRATOR v1.3
# Use: make PLATFORM=rpi or make PLATFORM=qemu

C_FILES = abyssrtos.c
OBJ_FILES = $(C_FILES:.c=.o)
KERNEL_ELF = abyssrtos.elf
KERNEL_IMG = kernel7.img

ifeq ($(PLATFORM), rpi)
    CC = arm-none-eabi-gcc
    LD = arm-none-eabi-ld
    CFLAGS = -mcpu=cortex-a72 -fpic -ffreestanding -std=gnu99 -O2 -Wall -Wextra
    LDFLAGS = -T linker.ld -nostdlib
    OUTPUT = $(KERNEL_IMG)
else
    CC = gcc
    LD = ld
    CFLAGS = -ffreestanding -O2 -Wall -Wextra
    LDFLAGS = -T linker.ld -nostdlib
    OUTPUT = $(KERNEL_ELF)
endif

all: $(OUTPUT)

$(OUTPUT): $(OBJ_FILES)
	$(LD) $(LDFLAGS) $(OBJ_FILES) -o $(KERNEL_ELF)
ifeq ($(PLATFORM), rpi)
	arm-none-eabi-objcopy $(KERNEL_ELF) -O binary $(KERNEL_IMG)
endif
	@echo " [RES] BUILD_COMPLETE: $(OUTPUT)"

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f *.o *.elf *.img

run: all
ifeq ($(PLATFORM), qemu)
	qemu-system-x86_64 -kernel $(KERNEL_ELF) -serial stdio
else
	@echo " [ERR] Run command only supported for QEMU target."
endif
