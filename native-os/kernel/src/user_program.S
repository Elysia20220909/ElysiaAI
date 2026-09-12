.section .rodata.user_image, "a"
.global user_image_start
.global user_image_end
user_image_start:
    cmp r13, 21
    jae ipc_start
    cmp r13, 18
    jae lifecycle_start
    mov rax, r12
    add rax, 0x41
    mov byte ptr [0x60000000], al
    mov rax, r12
    add rax, 0x1234
    mov qword ptr [0x60000008], rax
    push rax
    push r12

    // Unknown syscall, kernel pointer, peer page, overflow, non-canonical,
    // unmapped, oversized and cross-page buffers must return errors, not fault.
    mov eax, 99
    int 0x80
    cmp rax, -38
    jne user_fail
    mov eax, 2
    mov rdi, -1
    int 0x80
    cmp rax, -22
    jne user_fail
    mov edi, 0x02000000
    mov esi, 1
    call expect_range_error
    xor edi, edi
    call expect_range_error
    mov rdi, -1
    mov esi, 2
    call expect_range_error
    mov rdi, 0x0001000000000000
    mov esi, 1
    call expect_range_error
    mov edi, 0x50000000
    call expect_range_error
    mov edi, 0x60000fff
    mov esi, 2
    call expect_range_error
    mov edi, 0x60000000
    mov esi, 129
    call expect_range_error
    mov rdi, r12
    xor rdi, 1
    shl rdi, 13
    add rdi, 0x70000000
    mov esi, 1
    call expect_range_error

    xor eax, eax
    mov edi, 0x60000000
    mov esi, 1
    int 0x80
    cmp rax, 1
    jne user_fail

    mov ebx, 0x1122
    mov ecx, 0x3344
    mov edx, 0x5566
    mov ebp, 0x7788
    mov r8d, 0x8899
    mov r9d, 0x99aa
    mov r10d, 0xaabb
    mov r11d, 0xbbcc
    mov r14d, 0xccdd
    mov r15d, 0xddee
    mov eax, 1
    std
    pushfq
    or qword ptr [rsp], 0x4000
    popfq
    int 0x80
    // DF is cleared for Rust but restored for the user by IRET.
    cmp rdi, 0x60000000
    jne user_fail
    pushfq
    pop rdi
    test edi, 0x4000
    jnz user_fail
    test edi, 0x400
    jz user_fail
    cld
    cmp rax, 0
    jne user_fail
    cmp rbx, 0x1122
    jne user_fail
    cmp rcx, 0x3344
    jne user_fail
    cmp rdx, 0x5566
    jne user_fail
    cmp rbp, 0x7788
    jne user_fail
    cmp r8, 0x8899
    jne user_fail
    cmp r9, 0x99aa
    jne user_fail
    cmp r10, 0xaabb
    jne user_fail
    cmp r11, 0xbbcc
    jne user_fail
    cmp r14, 0xccdd
    jne user_fail
    cmp r15, 0xddee
    jne user_fail
    cmp rsi, 1
    jne user_fail
    pop rax
    cmp rax, r12
    jne user_fail
    pop rax
    cmp rax, qword ptr [0x60000008]
    jne user_fail
    sub rax, 0x1234
    cmp rax, r12
    jne user_fail
    add byte ptr [0x60000000], 32
    xor eax, eax
    mov edi, 0x60000000
    mov esi, 1
    int 0x80
    cmp rax, 1
    jne user_fail
    cmp r12, 0
    jne user_exit
    cmp r13, 7
    je user_exit
    cmp r13, 8
    je probe_kernel
    cmp r13, 9
    je probe_peer
    cmp r13, 10
    je probe_readonly
    cmp r13, 11
    je probe_noexecute
    cmp r13, 12
    je probe_opcode
    cmp r13, 13
    je probe_io
    cmp r13, 14
    je probe_stack
    cmp r13, 15
    je probe_gate
    cmp r13, 16
    je probe_fpu
    cmp r13, 17
    je probe_return
    jmp user_fail
probe_kernel:
    mov rax, qword ptr [0x02000000]
    jmp user_fail
probe_peer:
    mov rax, qword ptr [0x70002000]
    jmp user_fail
probe_readonly:
    mov byte ptr [0x40000000], 0
    jmp user_fail
probe_noexecute:
    mov byte ptr [0x60000000], 0xc3
    mov eax, 0x60000000
    call rax
    jmp user_fail
probe_opcode:
    ud2
    jmp user_fail
probe_io:
    mov dx, 0xf4
    xor eax, eax
    out dx, eax
    jmp user_fail
probe_stack:
    mov esp, 0x90000000
    push rax
    jmp user_fail
probe_return:
    mov rsp, 0x0001000000000000
    mov eax, 1
    int 0x80
    jmp user_fail
probe_gate:
    int 0x40
    jmp user_fail
probe_fpu:
    fld1
    jmp user_fail
expect_range_error:
    xor eax, eax
    int 0x80
    cmp rax, -14
    jne user_fail
    ret
user_exit:
    mov eax, 2
    xor edi, edi
    int 0x80
    ud2
user_fail:
    mov eax, 2
    mov edi, 1
    int 0x80
    ud2
// Fresh pages must not expose a previous owner's data, even when reused.
lifecycle_start:
    cmp qword ptr [0x60000000], 0
    jne user_fail
    mov rdi, r12
    shl rdi, 13
    add rdi, 0x70000000
    cmp qword ptr [rdi], 0
    jne user_fail
    mov rax, 0x80000ff8
    cmp qword ptr [rax], 0
    jne user_fail
    mov rax, r14
    inc rax
    mov qword ptr [0x60000000], rax
    mov qword ptr [rdi], rax
    push rax
    cmp r13, 19
    jne preempt_start
    test r12, r12
    jz user_exit
    ud2
preempt_start:
    // At CPL3, POPF cannot clear IF with IOPL=0.
    pushfq
    and qword ptr [rsp], -513
    popfq
    pushfq
    pop rax
    test eax, 0x200
    jz user_fail
    test r12, r12
    jnz survivor_start
    cmp r13, 20
    je yielding_hog
cpu_hog:
    jmp cpu_hog
yielding_hog:
    mov eax, 1
    int 0x80
    jmp yielding_hog
survivor_start:
    mov byte ptr [0x60000000], 0x50
    xor eax, eax
    mov edi, 0x60000000
    mov esi, 1
    int 0x80
    cmp rax, 1
    jne user_fail
    mov ebx, 0x1122
    mov r15d, 0x3344
    mov ecx, 16000000
survivor_loop:
    cmp ebx, 0x1122
    jne user_fail
    cmp r15d, 0x3344
    jne user_fail
    dec ecx
    jnz survivor_loop
    pop rax
    cmp rax, 1
    jne user_fail
    mov byte ptr [0x60000000], 0x51
    xor eax, eax
    int 0x80
    cmp rax, 1
    jne user_fail
    jmp user_exit
