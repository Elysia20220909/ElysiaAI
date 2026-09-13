// Read-only RAM document client and IPC service, both in Ring 3.
// r11: own document grant; r14: disclosed foreign grant (negative fixture).
.section .rodata.user_image,"a"
document_start:
    test r12, r12
    jnz document_service
    mov eax, 6
    mov edi, 0x60000100
    mov esi, 64
    int 0x80
    cmp rax, -13
    jne user_fail
    call document_request_init
    cmp r13, 31
    jae document_peer_closure
    call document_exchange
    cmp qword ptr [0x60000100], 0
    jne user_fail
    cmp qword ptr [0x60000108], 17
    jne user_fail
    mov rax, 0x5220414953594c45
    cmp [0x60000110], rax
    jne user_fail
    mov rax, 0x4544495547204d41
    cmp [0x60000118], rax
    jne user_fail
    cmp byte ptr [0x60000120], 10
    jne user_fail
    cmp r13, 28
    je document_denied
    cmp r13, 29
    je document_revoke
    cmp r13, 30
    je document_range
    mov qword ptr [0x60000010], 7
    mov qword ptr [0x60000018], 3
    call document_exchange
    cmp qword ptr [0x60000100], 0
    jne user_fail
    cmp qword ptr [0x60000108], 3
    jne user_fail
    cmp dword ptr [0x60000110], 0x4d4152
    jne user_fail
    mov qword ptr [0x60000010], 17
    mov qword ptr [0x60000018], 0
    call document_exchange
    xor ebx, ebx
    call document_empty
    jmp ipc_ok
document_denied:
    mov qword ptr [0x60000008], 0
    call document_exchange
    mov rbx, -9
    call document_empty
    mov [0x60000008], r14
    call document_exchange
    call document_empty
    mov [0x60000008], r11
    mov qword ptr [0x60000000], 3
    call document_exchange
    mov rbx, -38
    call document_empty
    mov qword ptr [0x60000000], 1
    mov edx, 31
    call document_exchange_length
    mov rbx, -22
    call document_empty
    jmp ipc_ok
document_revoke:
    mov qword ptr [0x60000000], 2
    mov qword ptr [0x60000018], 0
    call document_exchange
    xor ebx, ebx
    call document_empty
    mov qword ptr [0x60000000], 1
    mov qword ptr [0x60000018], 1
    call document_exchange
    mov rbx, -9
    call document_empty
    jmp ipc_ok
document_range:
    mov qword ptr [0x60000010], -1
    mov qword ptr [0x60000018], 2
    call document_exchange
    mov rbx, -22
    call document_empty
    mov qword ptr [0x60000010], 18
    mov qword ptr [0x60000018], 0
    call document_exchange
    call document_empty
    mov qword ptr [0x60000010], 0
    mov qword ptr [0x60000018], 49
    call document_exchange
    mov rbx, -90
    call document_empty
    jmp ipc_ok
document_peer_closure:
    mov edx, 32
    call document_send
    call document_receive
    cmp rax, -32
    jne user_fail
    mov eax, 3
    mov rdi, r8
    mov esi, 0x60000000
    mov edx, 32
    int 0x80
    cmp rax, -32
    jne user_fail
    jmp ipc_ok
document_request_init:
    mov qword ptr [0x60000000], 1
    mov [0x60000008], r11
    mov qword ptr [0x60000010], 0
    mov qword ptr [0x60000018], 17
    ret
document_exchange:
    mov edx, 32
document_exchange_length:
    call document_send
    call document_receive
    cmp rax, 64
    jne user_fail
    ret
document_send:
    mov eax, 3
    mov rdi, r8
    mov esi, 0x60000000
    int 0x80
    cmp rax, rdx
    jne user_fail
    ret
document_receive:
    mov eax, 4
    mov rdi, r9
    mov esi, 0x60000100
    mov edx, 64
    int 0x80
    ret
document_empty:
    cmp [0x60000100], rbx
    jne user_fail
    mov esi, 0x60000108
    mov ecx, 7
1:
    cmp qword ptr [rsi], 0
    jne user_fail
    add esi, 8
    loop 1b
    ret
document_service:
    mov eax, 4
    mov rdi, r9
    mov esi, 0x60000000
    mov edx, 64
    int 0x80
    cmp rax, -32
    je user_exit
    test rax, rax
    js user_fail
    cmp r13, 31
    je user_exit
    cmp r13, 32
    je probe_opcode
    // Cannot overwrite a delivered request with another receive.
    mov eax, 4
    int 0x80
    cmp rax, -11
    jne user_fail
    // Bad destination must leave the request available for a valid retry.
    mov eax, 6
    mov edi, 0x40000000
    mov esi, 64
    int 0x80
    cmp rax, -14
    jne user_fail
    mov eax, 6
    mov edi, 0x60000100
    int 0x80
    cmp rax, 64
    jne user_fail
    mov eax, 6
    int 0x80
    cmp rax, -11
    jne user_fail
    mov eax, 3
    mov rdi, r8
    mov esi, 0x60000100
    mov edx, 64
    int 0x80
    cmp rax, 64
    jne user_fail
    jmp document_service
user_image_end:
