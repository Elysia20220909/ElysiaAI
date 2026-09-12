.section .text, "ax"
.global trap_0
trap_0:
push 0
push 0
jmp trap_common
.global trap_1
trap_1:
push 0
push 1
jmp trap_common
.global trap_2
trap_2:
push 0
push 2
jmp trap_common
.global trap_3
trap_3:
push 0
push 3
jmp trap_common
.global trap_4
trap_4:
push 0
push 4
jmp trap_common
.global trap_5
trap_5:
push 0
push 5
jmp trap_common
.global trap_6
trap_6:
push 0
push 6
jmp trap_common
.global trap_7
trap_7:
push 0
push 7
jmp trap_common
.global trap_8
trap_8:
push 8
jmp trap_common
.global trap_9
trap_9:
push 0
push 9
jmp trap_common
.global trap_10
trap_10:
push 10
jmp trap_common
.global trap_11
trap_11:
push 11
jmp trap_common
.global trap_12
trap_12:
push 12
jmp trap_common
.global trap_13
trap_13:
push 13
jmp trap_common
.global trap_14
trap_14:
push 14
jmp trap_common
.global trap_15
trap_15:
push 0
push 15
jmp trap_common
.global trap_16
trap_16:
push 0
push 16
jmp trap_common
.global trap_17
trap_17:
push 17
jmp trap_common
.global trap_18
trap_18:
push 0
push 18
jmp trap_common
.global trap_19
trap_19:
push 0
push 19
jmp trap_common
.global trap_20
trap_20:
push 0
push 20
jmp trap_common
.global trap_21
trap_21:
push 21
jmp trap_common
.global trap_22
trap_22:
push 0
push 22
jmp trap_common
.global trap_23
trap_23:
push 0
push 23
jmp trap_common
.global trap_24
trap_24:
push 0
push 24
jmp trap_common
.global trap_25
trap_25:
push 0
push 25
jmp trap_common
.global trap_26
trap_26:
push 0
push 26
jmp trap_common
.global trap_27
trap_27:
push 0
push 27
jmp trap_common
.global trap_28
trap_28:
push 0
push 28
jmp trap_common
.global trap_29
trap_29:
push 29
jmp trap_common
.global trap_30
trap_30:
push 30
jmp trap_common
.global trap_31
trap_31:
push 0
push 31
jmp trap_common
.global trap_128
trap_128:
push 0
push 128
jmp trap_common
.global trap_255
trap_255:
push 0
push 255
jmp trap_common
trap_common:
push rax
push rbx
push rcx
push rdx
push rbp
push rsi
push rdi
push r8
push r9
push r10
push r11
push r12
push r13
push r14
push r15
cld
mov rdi, rsp
and rsp, -16
call dispatch_trap
mov rdi, rax
.global restore_user
restore_user:
mov rsp, rdi
pop r15
pop r14
pop r13
pop r12
pop r11
pop r10
pop r9
pop r8
pop rdi
pop rsi
pop rbp
pop rdx
pop rcx
pop rbx
pop rax
add rsp, 16
iretq
