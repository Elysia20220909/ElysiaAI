[bits 64]

section .text
extern interrupt_handler
extern scheduler
global load_idt
global isr_stub_table

; Macro for ISRs with no error code
%macro ISR_NOERR 1
global isr_stub_%1
isr_stub_%1:
    push byte 0
    push %1
    jmp isr_common
%endmacro

; Macro for ISRs with error code
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

; IRQs (0-15 mapped to 32-47)
%assign i 32
%rep 16
    ISR_NOERR i
%assign i i+1
%endrep

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

    mov rdi, [rsp + 112] ; Get the vector number (vector was at rsp+16 before pushes, now at 16+96=112)
    cmp rdi, 32         ; IRQ 0 (Timer)
    jne .not_timer

    ; --- SOVEREIGN CONTEXT SWITCH ---
    mov rdi, rsp        ; Current SP
    call scheduler      ; Scheduler returns NEW SP in RAX
    mov rsp, rax        ; SWITCH STACK
    
    ; Signal EOI to PIC
    mov al, 0x20
    out 0x20, al
    jmp .exit

.not_timer:
    mov rdi, [rsp + 112] ; Pass vector to handler
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
