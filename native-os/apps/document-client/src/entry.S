// Independent recovery client; only its own capabilities arrive at entry.
.section .text.entry,"ax"
    ud2
    .space 14
.global _start
_start:
    test r12, r12
    jnz recovery_fail
    test r10, r10
    jnz recovery_fail
    test r14, r14
    jnz recovery_fail
    test r8, r8
    jz recovery_fail
    test r9, r9
    jz recovery_fail
    test r11, r11
    jz recovery_fail
    cmp qword ptr [0x60000388], 0x13579
    jne recovery_fail
    cmp qword ptr [0x60000390], 0
    jne recovery_fail
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
    mov eax, 6
    mov edi, 0x60000100
    mov esi, 64
    int 0x80
    cmp rax, -13
    jne recovery_fail
    mov qword ptr [0x60000300], 0x13579
    // A live service cannot be replaced.
    call recovery_connect
    cmp rax, -11
    jne recovery_fail
recovery_disconnect:
    call recovery_request
    call recovery_send
    call recovery_receive
    cmp rax, -32
    jne recovery_fail
    // These are retained only to prove the next generation rejects them.
    mov rbx, r8
    mov r10, r9
    mov rbp, r11
    cmp r15, 8
    je recovery_limit
    mov eax, 7
    mov edi, 0x40000000
    mov esi, 24
    int 0x80
    cmp rax, -14
    jne recovery_fail
    mov eax, 7
    mov edi, 0x60000200
    xor esi, esi
    int 0x80
    cmp rax, -22
    jne recovery_fail
    cmp r13, 37
    jne recovery_retry
    call recovery_connect
    cmp rax, -12
    jne recovery_fail
    cmp qword ptr [0x60000200], 0
    jne recovery_fail
recovery_retry:
    call recovery_connect
    cmp rax, 24
    jne recovery_fail
    inc r15
    cmp qword ptr [0x60000300], 0x13579
    jne recovery_fail
    mov r8, [0x60000200]
    mov r9, [0x60000208]
    mov r11, [0x60000210]
    cmp r8, rbx
    je recovery_fail
    cmp r9, r10
    je recovery_fail
    cmp r11, rbp
    je recovery_fail
    mov eax, 3
    mov rdi, rbx
    mov esi, 0x60000000
    mov edx, 32
    int 0x80
    cmp rax, -9
    jne recovery_fail
    mov eax, 4
    mov rdi, r10
    mov esi, 0x60000100
    mov edx, 64
    int 0x80
    cmp rax, -9
    jne recovery_fail
    call recovery_request
    mov [0x60000008], rbp
    call recovery_exchange
    call recovery_denied
    call recovery_request
    mov qword ptr [0x60000008], 0
    call recovery_exchange
    call recovery_denied
    call recovery_request
    call recovery_exchange
    cmp qword ptr [0x60000100], 0
    jne recovery_fail
    cmp qword ptr [0x60000108], 17
    jne recovery_fail
    mov rax, 0x5220414953594c45
    cmp [0x60000110], rax
    jne recovery_fail
    mov rax, 0x4544495547204d41
    cmp [0x60000118], rax
    jne recovery_fail
    cmp byte ptr [0x60000120], 10
    jne recovery_fail
    cmp r13, 38
    je recovery_disconnect
    cmp r13, 36
    jne recovery_ok
    cmp r15, 8
    jb recovery_disconnect
    jmp recovery_ok
recovery_limit:
    call recovery_connect
    cmp rax, -11
    jne recovery_fail
    jmp recovery_ok
recovery_connect:
    mov eax, 7
    mov edi, 0x60000200
    mov esi, 24
    int 0x80
    ret
recovery_request:
    mov qword ptr [0x60000000], 1
    mov [0x60000008], r11
    mov qword ptr [0x60000010], 0
    mov qword ptr [0x60000018], 17
    ret
recovery_exchange:
    call recovery_send
    call recovery_receive
    cmp rax, 64
    jne recovery_fail
    ret
recovery_send:
    mov eax, 3
    mov rdi, r8
    mov esi, 0x60000000
    mov edx, 32
    int 0x80
    cmp rax, 32
    jne recovery_fail
    ret
recovery_receive:
    mov eax, 4
    mov rdi, r9
    mov esi, 0x60000100
    mov edx, 64
    int 0x80
    ret
recovery_denied:
    cmp qword ptr [0x60000100], -9
    jne recovery_fail
    mov esi, 0x60000108
    mov ecx, 7
1:
    cmp qword ptr [rsi], 0
    jne recovery_fail
    add esi, 8
    loop 1b
    ret
recovery_ok:
    cmp qword ptr [0x60000300], 0x13579
    jne recovery_fail
    mov word ptr [0x60000000], 0x6b6f
    xor eax, eax
    mov edi, 0x60000000
    mov esi, 2
    int 0x80
    cmp rax, 2
    jne recovery_fail
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
    .quad 0x13579
.section .bss,"aw",@nobits
    .space 16
