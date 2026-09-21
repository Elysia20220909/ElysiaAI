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
.ifdef INFERENCE_CLIENT
    // SysV caller-saved capability registers survive the inference call.
    push r8
    push r9
    push r11
    sub rsp, 8
    mov rdi, r13
    call inference_propose
    add rsp, 8
    pop r11
    pop r9
    pop r8
    test rax, rax
    jz recovery_ok
    mov [0x60000380], rax
.endif
    cmp r13, 45
    jae operation_client
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

// Fixed proposal agent for the operation-contract fixture. Cannot approve itself.
operation_client:
    mov qword ptr [0x60000000], 11
    mov qword ptr [0x60000008], r11
    mov qword ptr [0x60000010], 0
    cmp r13, 49
    jne 2f
    mov qword ptr [0x60000010], 999
2:
    mov qword ptr [0x60000018], 16
.ifdef INFERENCE_CLIENT
    mov rax, [0x60000380]
    mov [0x60000018], rax
.endif
    call recovery_exchange
    cmp qword ptr [0x60000100], -13
    jne recovery_fail
    // Agent-supplied approval command is not an interface.
    mov qword ptr [0x60000000], 14
    call recovery_exchange
    cmp qword ptr [0x60000100], -38
    jne recovery_fail
    mov qword ptr [0x60000000], 10
    call recovery_exchange
    cmp qword ptr [0x60000100], 0
    jne recovery_fail
    cmp r13, 57
    je async_wait_start
    cmp r13, 56
    je async_wait_start
    cmp r13, 55
    jne 9f
async_wait_start:
    xor ebp, ebp
async_wait:
    // Bounded independent arithmetic while the operation remains pending.
    mov ecx, 100000
async_compute:
    inc rbp
    pause
    loop async_compute
    mov eax, 8
    mov rdi, rbp
    int 0x80
    cmp rax, 1
    je async_wait
    cmp rax, 2
    je 9f
    cmp rax, 5
    je 9f
    cmp rax, 7
    jne recovery_fail
9:
    cmp r13, 47
    jne 3f
    mov qword ptr [0x60000000], 12
    call recovery_exchange
    cmp qword ptr [0x60000100], 0
    jne recovery_fail
3:
    mov qword ptr [0x60000000], 11
    cmp r13, 57
    je 8f
    cmp r13, 56
    je 8f
    cmp r13, 55
    je 8f
    cmp r13, 45
    jne 4f
8:
    // Changed input after approval must not execute.
    mov qword ptr [0x60000018], 8
.ifdef INFERENCE_CLIENT
    mov rax, [0x60000380]
    xor rax, 24
    mov [0x60000018], rax
.endif
    call recovery_exchange
    cmp qword ptr [0x60000100], -13
    jne recovery_fail
    mov qword ptr [0x60000018], 16
.ifdef INFERENCE_CLIENT
    mov rax, [0x60000380]
    mov [0x60000018], rax
.endif
4:
    call recovery_send
    call recovery_receive
    cmp r13, 48
    jne 5f
    cmp rax, -32
    jne recovery_fail
    jmp recovery_ok
5:
    cmp rax, 64
    jne recovery_fail
    cmp r13, 57
    je async_result
    cmp r13, 56
    je async_result
    cmp r13, 55
    jne 7f
async_result:
    cmp qword ptr [0x60000100], -13
    je recovery_ok
    jmp operation_success
7:
    cmp r13, 45
    je operation_success
    cmp r13, 49
    je operation_failure
    cmp qword ptr [0x60000100], -13
    jne recovery_fail
    jmp recovery_ok
operation_failure:
    cmp qword ptr [0x60000100], -22
    jne recovery_fail
    jmp operation_duplicate
operation_success:
    cmp qword ptr [0x60000100], 0
    jne recovery_fail
.ifdef INFERENCE_CLIENT
    mov rax, [0x60000380]
    cmp [0x60000108], rax
.else
    cmp qword ptr [0x60000108], 16
.endif
    jne recovery_fail
    cmp dword ptr [0x60000110], 0x53594c45
    jne recovery_fail
operation_duplicate:
    call recovery_exchange
    cmp qword ptr [0x60000100], -13
    jne recovery_fail
    jmp recovery_ok

.section .data,"aw"
    .space 0x388
    .quad 0x13579
.section .bss,"aw",@nobits
    .space 16
