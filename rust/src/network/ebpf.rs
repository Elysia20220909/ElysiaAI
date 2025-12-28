/// eBPF風の高速パケットフィルタとJITコンパイラ
/// 
/// 参考: Linux eBPF (extended Berkeley Packet Filter)
/// - 動的なパケットフィルタリング
/// - JITコンパイルによる高速化
/// - 安全性検証

use std::fmt;
use std::collections::HashMap;

/// eBPF命令セット
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BpfInstruction {
    /// Load: レジスタにパケットデータをロード
    /// LoadAbsolute(offset) - パケットの絶対オフセットからロード
    LoadAbsolute(u32),
    
    /// LoadIndirect(offset, register) - レジスタ値+オフセットからロード
    LoadIndirect(u32, u8),
    
    /// LoadRegister(dst, src) - レジスタ間コピー
    LoadRegister(u8, u8),
    
    /// Store(register, value) - レジスタに即値を格納
    Store(u8, u64),
    
    /// 算術演算
    Add(u8, u8),      // dst = dst + src
    Sub(u8, u8),      // dst = dst - src
    Mul(u8, u8),      // dst = dst * src
    Div(u8, u8),      // dst = dst / src
    And(u8, u8),      // dst = dst & src
    Or(u8, u8),       // dst = dst | src
    Xor(u8, u8),      // dst = dst ^ src
    Shl(u8, u8),      // dst = dst << src
    Shr(u8, u8),      // dst = dst >> src
    
    /// 比較とジャンプ
    JumpEqual(u8, u64, i16),        // if reg == value, jump offset
    JumpNotEqual(u8, u64, i16),     // if reg != value, jump offset
    JumpGreater(u8, u64, i16),      // if reg > value, jump offset
    JumpLess(u8, u64, i16),         // if reg < value, jump offset
    Jump(i16),                       // unconditional jump
    
    /// 戻り値
    Return(u8),  // return register value
    
    /// 関数呼び出し
    Call(u32),   // call helper function
    
    /// Exit
    Exit,
}

/// BPFプログラム
#[derive(Debug, Clone)]
pub struct BpfProgram {
    instructions: Vec<BpfInstruction>,
    name: String,
}

impl BpfProgram {
    pub fn new(name: &str) -> Self {
        BpfProgram {
            instructions: Vec::new(),
            name: name.to_string(),
        }
    }
    
    pub fn add_instruction(&mut self, inst: BpfInstruction) {
        self.instructions.push(inst);
    }
    
    pub fn instructions(&self) -> &[BpfInstruction] {
        &self.instructions
    }
    
    /// プログラムを検証（安全性チェック）
    pub fn verify(&self) -> Result<(), String> {
        // 1. 無限ループ検出
        if self.instructions.len() > 4096 {
            return Err("Program too large".to_string());
        }
        
        // 2. 不正なジャンプ検出
        for (i, inst) in self.instructions.iter().enumerate() {
            match inst {
                BpfInstruction::Jump(offset) | 
                BpfInstruction::JumpEqual(_, _, offset) |
                BpfInstruction::JumpNotEqual(_, _, offset) |
                BpfInstruction::JumpGreater(_, _, offset) |
                BpfInstruction::JumpLess(_, _, offset) => {
                    let target = (i as i32 + *offset as i32 + 1) as usize;
                    if target >= self.instructions.len() {
                        return Err(format!("Invalid jump at instruction {}", i));
                    }
                }
                _ => {}
            }
        }
        
        // 3. ExitまたはReturn命令の存在確認
        let has_exit = self.instructions.iter().any(|inst| {
            matches!(inst, BpfInstruction::Exit | BpfInstruction::Return(_))
        });
        
        if !has_exit {
            return Err("Program must have Exit or Return instruction".to_string());
        }
        
        Ok(())
    }
}

/// BPFインタプリタ（VM実行）
#[derive(Debug)]
pub struct BpfInterpreter {
    registers: [u64; 16],  // R0-R15
    program_counter: usize,
    packet_data: Vec<u8>,
}

impl BpfInterpreter {
    pub fn new() -> Self {
        BpfInterpreter {
            registers: [0; 16],
            program_counter: 0,
            packet_data: Vec::new(),
        }
    }
    
    pub fn load_packet(&mut self, data: Vec<u8>) {
        self.packet_data = data;
    }
    
    /// プログラムを実行
    pub fn execute(&mut self, program: &BpfProgram) -> Result<u64, String> {
        self.program_counter = 0;
        self.registers = [0; 16];
        
        let instructions = program.instructions();
        let max_iterations = 10000; // 無限ループ防止
        let mut iterations = 0;
        
        while self.program_counter < instructions.len() {
            if iterations >= max_iterations {
                return Err("Maximum iterations exceeded".to_string());
            }
            iterations += 1;
            
            let inst = &instructions[self.program_counter];
            
            match inst {
                BpfInstruction::LoadAbsolute(offset) => {
                    let offset = *offset as usize;
                    if offset + 4 > self.packet_data.len() {
                        return Err("Out of bounds memory access".to_string());
                    }
                    let value = u32::from_be_bytes([
                        self.packet_data[offset],
                        self.packet_data[offset + 1],
                        self.packet_data[offset + 2],
                        self.packet_data[offset + 3],
                    ]);
                    self.registers[0] = value as u64;
                    self.program_counter += 1;
                }
                
                BpfInstruction::LoadIndirect(offset, reg) => {
                    let base = self.registers[*reg as usize] as usize;
                    let addr = base + *offset as usize;
                    if addr + 4 > self.packet_data.len() {
                        return Err("Out of bounds memory access".to_string());
                    }
                    let value = u32::from_be_bytes([
                        self.packet_data[addr],
                        self.packet_data[addr + 1],
                        self.packet_data[addr + 2],
                        self.packet_data[addr + 3],
                    ]);
                    self.registers[0] = value as u64;
                    self.program_counter += 1;
                }
                
                BpfInstruction::LoadRegister(dst, src) => {
                    self.registers[*dst as usize] = self.registers[*src as usize];
                    self.program_counter += 1;
                }
                
                BpfInstruction::Store(reg, value) => {
                    self.registers[*reg as usize] = *value;
                    self.program_counter += 1;
                }
                
                BpfInstruction::Add(dst, src) => {
                    self.registers[*dst as usize] = 
                        self.registers[*dst as usize].wrapping_add(self.registers[*src as usize]);
                    self.program_counter += 1;
                }
                
                BpfInstruction::Sub(dst, src) => {
                    self.registers[*dst as usize] = 
                        self.registers[*dst as usize].wrapping_sub(self.registers[*src as usize]);
                    self.program_counter += 1;
                }
                
                BpfInstruction::Mul(dst, src) => {
                    self.registers[*dst as usize] = 
                        self.registers[*dst as usize].wrapping_mul(self.registers[*src as usize]);
                    self.program_counter += 1;
                }
                
                BpfInstruction::Div(dst, src) => {
                    if self.registers[*src as usize] == 0 {
                        return Err("Division by zero".to_string());
                    }
                    self.registers[*dst as usize] /= self.registers[*src as usize];
                    self.program_counter += 1;
                }
                
                BpfInstruction::And(dst, src) => {
                    self.registers[*dst as usize] &= self.registers[*src as usize];
                    self.program_counter += 1;
                }
                
                BpfInstruction::Or(dst, src) => {
                    self.registers[*dst as usize] |= self.registers[*src as usize];
                    self.program_counter += 1;
                }
                
                BpfInstruction::Xor(dst, src) => {
                    self.registers[*dst as usize] ^= self.registers[*src as usize];
                    self.program_counter += 1;
                }
                
                BpfInstruction::Shl(dst, src) => {
                    self.registers[*dst as usize] <<= self.registers[*src as usize];
                    self.program_counter += 1;
                }
                
                BpfInstruction::Shr(dst, src) => {
                    self.registers[*dst as usize] >>= self.registers[*src as usize];
                    self.program_counter += 1;
                }
                
                BpfInstruction::JumpEqual(reg, value, offset) => {
                    if self.registers[*reg as usize] == *value {
                        self.program_counter = (self.program_counter as i32 + *offset as i32 + 1) as usize;
                    } else {
                        self.program_counter += 1;
                    }
                }
                
                BpfInstruction::JumpNotEqual(reg, value, offset) => {
                    if self.registers[*reg as usize] != *value {
                        self.program_counter = (self.program_counter as i32 + *offset as i32 + 1) as usize;
                    } else {
                        self.program_counter += 1;
                    }
                }
                
                BpfInstruction::JumpGreater(reg, value, offset) => {
                    if self.registers[*reg as usize] > *value {
                        self.program_counter = (self.program_counter as i32 + *offset as i32 + 1) as usize;
                    } else {
                        self.program_counter += 1;
                    }
                }
                
                BpfInstruction::JumpLess(reg, value, offset) => {
                    if self.registers[*reg as usize] < *value {
                        self.program_counter = (self.program_counter as i32 + *offset as i32 + 1) as usize;
                    } else {
                        self.program_counter += 1;
                    }
                }
                
                BpfInstruction::Jump(offset) => {
                    self.program_counter = (self.program_counter as i32 + *offset as i32 + 1) as usize;
                }
                
                BpfInstruction::Return(reg) => {
                    return Ok(self.registers[*reg as usize]);
                }
                
                BpfInstruction::Call(_func_id) => {
                    // ヘルパー関数呼び出し（簡略化）
                    self.program_counter += 1;
                }
                
                BpfInstruction::Exit => {
                    return Ok(self.registers[0]);
                }
            }
        }
        
        Ok(self.registers[0])
    }
}

impl Default for BpfInterpreter {
    fn default() -> Self {
        Self::new()
    }
}

/// BPF JITコンパイラ（x86_64向けネイティブコード生成の概念実装）
#[derive(Debug)]
pub struct BpfJitCompiler {
    native_code: Vec<u8>,
}

impl BpfJitCompiler {
    pub fn new() -> Self {
        BpfJitCompiler {
            native_code: Vec::new(),
        }
    }
    
    /// プログラムをJITコンパイル（概念実装）
    /// 実際のx86_64機械語を生成するのは複雑なため、ここでは構造のみ
    pub fn compile(&mut self, program: &BpfProgram) -> Result<(), String> {
        program.verify()?;
        
        // プロローグ: スタックフレーム設定
        self.emit_prologue();
        
        // 各命令をネイティブコードに変換
        for inst in program.instructions() {
            self.emit_instruction(inst)?;
        }
        
        // エピローグ: 戻り値設定とリターン
        self.emit_epilogue();
        
        Ok(())
    }
    
    fn emit_prologue(&mut self) {
        // x86_64プロローグ（簡略化）
        // push rbp
        self.native_code.push(0x55);
        // mov rbp, rsp
        self.native_code.extend_from_slice(&[0x48, 0x89, 0xe5]);
    }
    
    fn emit_epilogue(&mut self) {
        // x86_64エピローグ（簡略化）
        // mov rsp, rbp
        self.native_code.extend_from_slice(&[0x48, 0x89, 0xec]);
        // pop rbp
        self.native_code.push(0x5d);
        // ret
        self.native_code.push(0xc3);
    }
    
    fn emit_instruction(&mut self, inst: &BpfInstruction) -> Result<(), String> {
        match inst {
            BpfInstruction::Store(reg, value) => {
                // mov r{reg}, value (簡略化)
                self.native_code.push(0x48 | (*reg >> 3));
                self.native_code.push(0xb8 | (*reg & 0x7));
                self.native_code.extend_from_slice(&value.to_le_bytes());
            }
            
            BpfInstruction::Add(dst, src) => {
                // add r{dst}, r{src} (簡略化)
                self.native_code.push(0x48);
                self.native_code.push(0x01);
                self.native_code.push(0xc0 | (src << 3) | dst);
            }
            
            BpfInstruction::Return(_) | BpfInstruction::Exit => {
                // 既にエピローグで処理
            }
            
            _ => {
                // その他の命令は省略（実装は複雑）
            }
        }
        
        Ok(())
    }
    
    pub fn native_code(&self) -> &[u8] {
        &self.native_code
    }
}

impl Default for BpfJitCompiler {
    fn default() -> Self {
        Self::new()
    }
}

/// プログラムビルダー（高レベルAPI）
pub struct BpfProgramBuilder {
    program: BpfProgram,
}

impl BpfProgramBuilder {
    pub fn new(name: &str) -> Self {
        BpfProgramBuilder {
            program: BpfProgram::new(name),
        }
    }
    
    /// TCP SYNパケットをフィルタするプログラム例
    pub fn tcp_syn_filter(mut self) -> Self {
        // Ethernetヘッダースキップ (14バイト)
        // IPプロトコルチェック (オフセット23 = TCP)
        self.program.add_instruction(BpfInstruction::LoadAbsolute(23));
        self.program.add_instruction(BpfInstruction::Store(1, 6)); // TCP = 6
        self.program.add_instruction(BpfInstruction::JumpNotEqual(0, 6, 5));
        
        // TCPフラグチェック (IPヘッダー後、オフセット47でフラグ)
        self.program.add_instruction(BpfInstruction::LoadAbsolute(47));
        self.program.add_instruction(BpfInstruction::And(0, 1)); // SYNビット
        self.program.add_instruction(BpfInstruction::Store(2, 0x02));
        self.program.add_instruction(BpfInstruction::JumpEqual(0, 0x02, 1));
        
        // 不合格: return 0
        self.program.add_instruction(BpfInstruction::Store(0, 0));
        self.program.add_instruction(BpfInstruction::Return(0));
        
        // 合格: return 1
        self.program.add_instruction(BpfInstruction::Store(0, 1));
        self.program.add_instruction(BpfInstruction::Return(0));
        
        self
    }
    
    /// HTTP (port 80) トラフィックフィルタ
    pub fn http_filter(mut self) -> Self {
        // TCPチェック
        self.program.add_instruction(BpfInstruction::LoadAbsolute(23));
        self.program.add_instruction(BpfInstruction::JumpNotEqual(0, 6, 7));
        
        // 宛先ポート80チェック (オフセット36-37)
        self.program.add_instruction(BpfInstruction::LoadAbsolute(36));
        self.program.add_instruction(BpfInstruction::Shr(0, 1)); // 右シフトで下位16bit
        self.program.add_instruction(BpfInstruction::And(0, 1));
        self.program.add_instruction(BpfInstruction::JumpEqual(0, 80, 1));
        
        // 不合格
        self.program.add_instruction(BpfInstruction::Store(0, 0));
        self.program.add_instruction(BpfInstruction::Return(0));
        
        // 合格
        self.program.add_instruction(BpfInstruction::Store(0, 1));
        self.program.add_instruction(BpfInstruction::Return(0));
        
        self
    }
    
    pub fn build(self) -> Result<BpfProgram, String> {
        self.program.verify()?;
        Ok(self.program)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_bpf_simple_program() {
        let mut program = BpfProgram::new("test");
        program.add_instruction(BpfInstruction::Store(0, 42));
        program.add_instruction(BpfInstruction::Return(0));
        
        assert!(program.verify().is_ok());
        
        let mut vm = BpfInterpreter::new();
        let result = vm.execute(&program).unwrap();
        assert_eq!(result, 42);
    }
    
    #[test]
    fn test_bpf_arithmetic() {
        let mut program = BpfProgram::new("arithmetic");
        program.add_instruction(BpfInstruction::Store(0, 10));
        program.add_instruction(BpfInstruction::Store(1, 5));
        program.add_instruction(BpfInstruction::Add(0, 1)); // 10 + 5 = 15
        program.add_instruction(BpfInstruction::Return(0));
        
        let mut vm = BpfInterpreter::new();
        let result = vm.execute(&program).unwrap();
        assert_eq!(result, 15);
    }
    
    #[test]
    fn test_bpf_conditional_jump() {
        let mut program = BpfProgram::new("conditional");
        program.add_instruction(BpfInstruction::Store(0, 100));
        program.add_instruction(BpfInstruction::JumpGreater(0, 50, 2)); // if R0 > 50, jump +2
        program.add_instruction(BpfInstruction::Store(0, 0));
        program.add_instruction(BpfInstruction::Return(0));
        program.add_instruction(BpfInstruction::Store(0, 1));
        program.add_instruction(BpfInstruction::Return(0));
        
        let mut vm = BpfInterpreter::new();
        let result = vm.execute(&program).unwrap();
        assert_eq!(result, 1);
    }
}
