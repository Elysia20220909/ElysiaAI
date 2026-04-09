// AbyssRTOS v1.3 - Licensed under GPLv3
// Copyright (C) AbyssRTOS Project

#ifndef ABYSSRTOS_H
#define ABYSSRTOS_H

#define PLATFORM_RPI 1

// ドライバ関数のプロトタイプ
void uart_init();
void gpio_init();
void i2c_init();
void spi_init();
void usb_init();
void can_init();
void timer_init();

// タスク関数のプロトタイプ
void abyss_net_task();
void task_gui();
void task_log();
void abyss_gpio_task();
void abyss_i2c_task();
void abyss_spi_task();
void abyss_editor_task();
void abyss_usb_task();

// スケジューラ関数のプロトタイプ
void task_create(uint32_t id, void (*func)(), uint32_t priority, uint32_t deadline);

// ユーティリティ関数のプロトタイプ
void serial_print(const char* str);
int login_authenticate();
void fs_init();
void fb_init();

// 仮実装のプロトタイプ
int human_test();
extern int human_score;

#endif // ABYSSRTOS_H

"args": [
    "-mcpu=cortex-a7",
    "-nostartfiles",
    "-o",
    "abyssrtos.elf",
    "abyssrtos.c",
    // 他の.cファイル
    "-Iinclude",
    "-Wall"
]
    "-Wextra",
    "-Werror",
    "-O2",
    "-ffunction-sections",
    "-fdata-sections",
    "-fomit-frame-pointer",
    "-fno-exceptions",
    "-fno-rtti",
    "-fno-unwind-tables",
    "-fno-asynchronous-unwind-tables",
    "-fno-stack-protector",
    "-fno-strict-aliasing",
    "-fno-merge-constants",
    "-fno-tree-sra",
    "-fno-tree-pre",
    "-fno-tree-dce",
    "-fno-tree-cfg",
    "-fno-tree-sink",
    "-fno-tree-copy-prop",
    "-fno-tree-loop-optimize"
    "-fno-tree-loop-distribute-patterns",
    "-fno-tree-loop-interchange",
    "-fno-tree-loop-unswitch",