// Independent ELF with initialized data and BSS, using the minimal user ABI.
.section .text.entry,"ax"
    ud2
    .space 14
.global _start
_start:
    test r8, r8
    jne fail
    test r9, r9
    jne fail
    test r11, r11
    jne fail
    mov rax, 0x1122334455667788
    cmp [0x60000000], rax
    jne fail
    mov esi, 0x60000008
    mov ecx, 9
1:
    cmp qword ptr [rsi], 0
    jne fail
    add esi, 8
    loop 1b
    mov [0x60000010], r12
    mov eax, 3
    int 0x80
    cmp rax, -38
    jne fail
    mov eax, 1
    int 0x80
    cmp [0x60000010], r12
    jne fail
    test r12, r12
    jnz done
    cmp r13, 40
    je fault
    cmp r13, 41
    je write_code
    cmp r13, 42
    je execute_data
done:
    mov word ptr [0x60000020], 0x6b6f
    xor eax, eax
    mov edi, 0x60000020
    mov esi, 2
    int 0x80
    cmp rax, 2
    jne fail
    mov eax, 2
    xor edi, edi
    int 0x80
fault:
    ud2
write_code:
    mov byte ptr [0x40000000], 0
    jmp fail
execute_data:
    mov byte ptr [0x60000000], 0xc3
    mov eax, 0x60000000
    call rax
fail:
    mov eax, 2
    mov edi, 1
    int 0x80
    ud2
.section .data,"aw"
    .quad 0x1122334455667788
.section .bss,"aw",@nobits
    .space 64
