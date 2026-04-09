CC = gcc
LD = ld
CFLAGS = -m32 -nostdlib -nostartfiles -nodefaultlibs -ffreestanding
LDFLAGS = -m elf_i386 -T linker.ld

all: abyssrtos.bin

abyssrtos.o: abyssrtos.c
    $(CC) $(CFLAGS) -c abyssrtos.c -o abyssrtos.o

abyssrtos.bin: abyssrtos.o
    $(LD) $(LDFLAGS) -o abyssrtos.bin abyssrtos.o

clean:
    rm -f *.o *.bin

run: abyssrtos.bin
    qemu-system-i386 -kernel abyssrtos.bin -serial stdio -vga std