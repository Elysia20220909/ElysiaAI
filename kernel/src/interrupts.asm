[bits 64]

section .text
extern interrupt_handler
extern scheduler
extern syscall_handler
global load_idt
global load_gdt
global isr_stub_table

; --- GDT Loading ---
load_gdt:
    lgdt [rdi]
    ; Reload segments
    push 0x08           ; Kernel Code Segment
    lea rax, [rel .reload_segments]
    push rax
    retfq               ; Far return to reload CS
.reload_segments:
    mov ax, 0x10        ; Kernel Data Segment
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax
    mov ss, ax
    ret

; --- IDT & Interrupts (from previous stage) ---
%macro ISR_NOERR 1
global isr_stub_%1
isr_stub_%1:
    push byte 0
    push %1
    jmp isr_common
%endmacro

%macro ISR_ERR 1
global isr_stub_%1
isr_stub_%1:
    push %1
    jmp isr_common
%endmacro

%assign i 0
%rep 32
    %if i == 8 || i == 10 || i == 11 || i == 12 || i == 13 || i == 14 || i == 17 || i == 21
        ISR_ERR i
    %else
        ISR_NOERR i
    %endif
%assign i i+1
%endrep

%assign i 32
%rep 16
    ISR_NOERR i
%assign i i+1
%endrep

; --- SYSCALL ENTRY (Vector 0x80 for simplicity) ---
ISR_NOERR 128

isr_common:
    push rbp
    push r15
    push r14
    push r13
    push r12
    push r11
    push r10
    push r9
    push r8
    push rax
    push rcx
    push rdx
    push rsi
    push rdi

    mov rdi, [rsp + 112]
    
    cmp rdi, 32         ; Timer
    jne .not_timer
    mov rdi, rsp
    call scheduler
    mov rsp, rax
    mov al, 0x20
    out 0x20, al
    jmp .exit

.not_timer:
    cmp rdi, 128        ; Syscall
    jne .not_syscall
    call syscall_handler
    jmp .exit

.not_syscall:
    call interrupt_handler

.exit:
    pop rdi
    pop rsi
    pop rdx
    pop rcx
    pop rax
    pop r8
    pop r9
    pop r10
    pop r11
    pop r12
    pop r13
    pop r14
    pop r15
    pop rbp
    add rsp, 16 
    iretq

load_idt:
    lidt [rdi]
    ret

section .data
isr_stub_table:
%assign i 0
%rep 48
    dq isr_stub_%+i
%assign i i+1
%endrep
%rep 80
    dq 0 ; Padding
%endrep
dq isr_stub_128 ; Vector 0x80
