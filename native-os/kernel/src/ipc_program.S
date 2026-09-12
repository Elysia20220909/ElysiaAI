.section .rodata.user_image, "a"
ipc_start:
    test r12, r12
    jnz ipc_service
    cmp r13, 26
    je ipc_queue_client
    cmp r13, 21
    jne ipc_client_wait
    // Guessing a token or knowing another process's token grants no authority.
    xor edi, edi
    call ipc_send_probe
    cmp rax, -9
    jne user_fail
    mov rdi, r10
    call ipc_send_probe
    cmp rax, -9
    jne user_fail
    mov rdi, r9
    call ipc_send_probe
    cmp rax, -13
    jne user_fail
    mov rdi, r8
    mov esi, 0x60000000
    mov edx, 65
    mov eax, 3
    int 0x80
    cmp rax, -90
    jne user_fail
    mov esi, 0x02000000
    mov edx, 1
    mov eax, 3
    int 0x80
    cmp rax, -14
    jne user_fail
    mov rdi, r9
    mov esi, 0x40000000
    mov eax, 4
    int 0x80
    cmp rax, -14
    jne user_fail
    mov esi, 0x70002000
    mov eax, 4
    int 0x80
    cmp rax, -14
    jne user_fail
    mov rsi, -1
    mov edx, 2
    mov eax, 4
    int 0x80
    cmp rax, -14
    jne user_fail
    mov esi, 0x60000008
    mov rdi, r8
    mov eax, 4
    int 0x80
    cmp rax, -13
    jne user_fail
    mov eax, 5
    int 0x80
    cmp rax, -13
    jne user_fail
    mov word ptr [0x60000000], 0x5841
    call ipc_send_two
    mov word ptr [0x60000000], 0x5942
    call ipc_send_two
    // Mutating the send buffer cannot change already queued messages.
    mov word ptr [0x60000000], 0x5a43
    call ipc_receive_two
    cmp word ptr [0x60000008], 0x5841
    jne user_fail
    call ipc_receive_two
    cmp word ptr [0x60000008], 0x5942
    jne user_fail
    jmp ipc_ok
ipc_client_wait:
    cmp r13, 24
    jne ipc_wait_now
    mov word ptr [0x60000000], 0x5841
    call ipc_send_two
ipc_wait_now:
    mov rdi, r9
    mov esi, 0x60000008
    mov edx, 2
    mov eax, 4
    int 0x80
    cmp r13, 25
    je ipc_deadlock_reply
    cmp rax, -32
    jne user_fail
    mov rdi, r8
    call ipc_send_probe
    cmp r13, 24
    je ipc_stale
    cmp rax, -32
    jne user_fail
    jmp ipc_ok
ipc_stale:
    cmp rax, -9
    jne user_fail
    mov rdi, r9
    mov esi, 0x60000008
    mov edx, 2
    mov eax, 4
    int 0x80
    cmp rax, -9
    jne user_fail
    jmp ipc_ok
ipc_deadlock_reply:
    cmp rax, 2
    jne user_fail
    cmp word ptr [0x60000008], 0x5942
    jne user_fail
    jmp ipc_ok
ipc_service:
    cmp r13, 26
    je ipc_queue_service
    cmp r13, 22
    je user_exit
    cmp r13, 23
    je probe_opcode
    cmp r13, 24
    je ipc_revoke
    cmp r13, 25
    je ipc_deadlock
    // An undersized receive must leave the queued message available.
    mov eax, 4
    mov rdi, r9
    mov esi, 0x60000008
    mov edx, 1
    int 0x80
    cmp rax, -90
    jne user_fail
    call ipc_receive_two
    cmp word ptr [0x60000008], 0x5841
    jne user_fail
    mov word ptr [0x60000000], 0x5841
    call ipc_send_two
    mov eax, 1
    int 0x80
    call ipc_receive_two
    cmp word ptr [0x60000008], 0x5942
    jne user_fail
    mov word ptr [0x60000000], 0x5942
    call ipc_send_two
    jmp ipc_wait_shutdown
ipc_revoke:
    mov eax, 5
    mov rdi, r9
    int 0x80
    test rax, rax
    jnz user_fail
    mov eax, 1
    int 0x80
    jmp user_exit
ipc_deadlock:
    mov eax, 4
    mov rdi, r9
    mov esi, 0x60000008
    mov edx, 2
    int 0x80
    cmp rax, -35
    jne user_fail
    mov word ptr [0x60000000], 0x5942
    call ipc_send_two
    jmp ipc_wait_shutdown
ipc_queue_client:
    mov word ptr [0x60000000], 0x5841
    call ipc_send_two
    call ipc_send_two
    mov rdi, r8
    call ipc_send_probe
    cmp rax, -11
    jne user_fail
    jmp ipc_ok
ipc_queue_service:
    // Never consume the client's queue. Zero-length messages are still bounded.
    mov rdi, r8
    mov esi, 0x60000000
    xor edx, edx
    mov eax, 3
    int 0x80
    cmp rax, -32
    je user_exit
    test rax, rax
    jz ipc_queue_yield
    cmp rax, -11
    jne user_fail
ipc_queue_yield:
    mov eax, 1
    int 0x80
    jmp ipc_queue_service
ipc_wait_shutdown:
    // Keep the service alive until the client consumes its reply and exits.
    mov eax, 4
    mov rdi, r9
    mov esi, 0x60000008
    mov edx, 2
    int 0x80
    cmp rax, -32
    jne user_fail
    jmp user_exit
ipc_send_probe:
    mov eax, 3
    mov esi, 0x60000000
    mov edx, 1
    int 0x80
    ret
ipc_send_two:
    mov rdi, r8
    mov esi, 0x60000000
    mov edx, 2
    mov eax, 3
    int 0x80
    cmp rax, 2
    jne user_fail
    ret
ipc_receive_two:
    mov rdi, r9
    mov esi, 0x60000008
    mov edx, 2
    mov eax, 4
    int 0x80
    cmp rax, 2
    jne user_fail
    ret
ipc_ok:
    mov word ptr [0x60000000], 0x6b6f
    mov eax, 0
    mov edi, 0x60000000
    mov esi, 2
    int 0x80
    cmp rax, 2
    jne user_fail
    jmp user_exit
user_image_end:
