// Dedicated document service. Handles arrive only from the kernel.
.section .text.entry,"ax"
    ud2
    .space 14
.global _start
_start:
    cmp r12, 1
    jne recovery_fail
    test r10, r10
    jnz recovery_fail
    test r14, r14
    jnz recovery_fail
    test r8, r8
    jz recovery_fail
    test r9, r9
    jz recovery_fail
    test r11, r11
    jnz recovery_fail
    // Unissued handles and wrong-operation handles must fail without queuing work.
    mov eax, 3
    xor edi, edi
    mov esi, 0x60000000
    mov edx, 32
    int 0x80
    cmp rax, -9
    jne recovery_fail
    mov eax, 4
    xor edi, edi
    mov esi, 0x60000100
    mov edx, 64
    int 0x80
    cmp rax, -9
    jne recovery_fail
    mov eax, 3
    mov rdi, r9
    mov esi, 0x60000000
    mov edx, 32
    int 0x80
    cmp rax, -13
    jne recovery_fail
    mov eax, 4
    mov rdi, r8
    mov esi, 0x60000100
    mov edx, 64
    int 0x80
    cmp rax, -13
    jne recovery_fail
    cmp qword ptr [0x60000388], 0x2468
    jne recovery_fail
    cmp qword ptr [0x60000390], 0
    jne recovery_fail
    mov qword ptr [0x60000390], 0x2468
    mov eax, 7
    mov edi, 0x60000200
    mov esi, 24
    int 0x80
    cmp rax, -13
    jne recovery_fail
    xor ebx, ebx
recovery_service_receive:
    mov eax, 4
    mov rdi, r9
    mov esi, 0x60000000
    mov edx, 64
    int 0x80
    cmp rax, -32
    je recovery_exit
    cmp rax, 32
    jne recovery_fail
    inc ebx
    cmp r13, 45
    jae operation_serve
    test r15, r15
    jz recovery_inject
    cmp ebx, 4
    je recovery_inject
operation_serve:
    mov eax, 6
    mov edi, 0x60000100
    mov esi, 64
    int 0x80
    cmp rax, 64
    jne recovery_fail
    cmp r13, 48
    jne 2f
    cmp qword ptr [0x60000000], 11
    jne 2f
    cmp qword ptr [0x60000100], 0
    jne 2f
    ud2
2:
    mov eax, 3
    mov rdi, r8
    mov esi, 0x60000100
    mov edx, 64
    int 0x80
    cmp rax, 64
    jne recovery_fail
    jmp recovery_service_receive
recovery_inject:
    cmp r13, 34
    je recovery_exit
    cmp r13, 35
    je recovery_spin
    ud2
recovery_spin:
    jmp recovery_spin
recovery_exit:
    mov eax, 2
    xor edi, edi
    int 0x80
    ud2
recovery_fail:
    mov eax, 2
    mov edi, 1
    int 0x80
    ud2

.section .data,"aw"
    .space 0x388
    .quad 0x2468
.section .bss,"aw",@nobits
    .space 16
