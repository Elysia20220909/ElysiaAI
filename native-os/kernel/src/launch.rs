//! Bounded boot definitions. Kernel policy, not ELF contents, authorizes resources.
use crate::Frame;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Elf {
    Client,
    Service,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Definition {
    pub elf: Elf,
    pub peer: usize,
    pub document: Option<usize>,
    /// All owned physical frames, including page tables.
    pub frames: usize,
    pub ticks: u64,
    /// Private inference arena quota, separate from the total owned-frame limit.
    pub memory_pages: usize,
}

const CEILING: [Definition; 2] = [
    Definition {
        elf: Elf::Client,
        peer: 1,
        document: Some(0),
        frames: 32,
        ticks: 1024,
        memory_pages: crate::inference_memory::MAX_PAGES,
    },
    Definition {
        elf: Elf::Service,
        peer: 0,
        document: None,
        frames: 32,
        ticks: 64,
        memory_pages: 0,
    },
];

/// Trusted boot configuration; may reduce, never enlarge, CEILING.
pub const BOOT: [Definition; 2] = [
    Definition {
        memory_pages: 0,
        ..CEILING[0]
    },
    CEILING[1],
];
/// Inference alone receives the arena quota; ordinary clients retain no arena authority.
pub const INFERENCE_BOOT: [Definition; 2] = CEILING;

/// A validated definition cannot be constructed or enlarged by callers.
#[derive(Clone, Copy)]
pub struct Validated {
    pid: usize,
    definition: Definition,
}
impl Definition {
    pub fn validate(self, pid: usize) -> Result<Validated, &'static str> {
        let allowed = CEILING.get(pid).ok_or("launch-slot")?;
        if self.elf != allowed.elf || self.peer != allowed.peer {
            return Err("launch-target");
        }
        if self.document.is_some() && self.document != allowed.document {
            return Err("launch-document");
        }
        if self.frames == 0
            || self.frames > allowed.frames
            || self.ticks == 0
            || self.ticks > allowed.ticks
            || self.memory_pages > allowed.memory_pages
        {
            return Err("launch-budget");
        }
        Ok(Validated {
            pid,
            definition: self,
        })
    }
}
impl Validated {
    pub fn elf(self) -> Elf {
        self.definition.elf
    }
    pub fn frames(self) -> usize {
        self.definition.frames
    }
    pub fn ticks(self) -> u64 {
        self.definition.ticks
    }
    pub fn memory_pages(self) -> usize {
        self.definition.memory_pages
    }
    pub fn document(self) -> Option<usize> {
        self.definition.document
    }
    pub fn frame(
        self,
        mode: u32,
        generation: u64,
        handles: [[u64; 2]; 2],
        grants: [u64; 2],
    ) -> Result<Frame, &'static str> {
        if (grants[self.pid] != 0) != self.definition.document.is_some() {
            return Err("launch-authority");
        }
        let [send, receive] = handles[self.pid];
        if send == 0 || receive == 0 || send == receive {
            return Err("launch-handles");
        }
        Ok(Frame {
            r8: send,
            r9: receive,
            r11: grants[self.pid],
            r12: self.pid as u64,
            r13: mode as u64,
            r15: generation,
            ..Frame::EMPTY
        })
    }
}

pub fn validate_pair(definitions: [Definition; 2]) -> Result<[Validated; 2], &'static str> {
    Ok([definitions[0].validate(0)?, definitions[1].validate(1)?])
}

/// Fresh registers contain only this process's communication handles and the client's grant.
/// R12/R13/R15 are fixture identity/mode/generation, not authority. Other GPRs remain zero.
pub fn recovery_frame(
    pid: usize,
    mode: u32,
    generation: u64,
    handles: [[u64; 2]; 2],
    grants: [u64; 2],
) -> Result<Frame, &'static str> {
    let definitions = validate_pair(BOOT)?;
    if grants[0] == 0 || grants[1] != 0 {
        return Err("launch-authority");
    }
    definitions
        .get(pid)
        .ok_or("launch-slot")?
        .frame(mode, generation, handles, grants)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        documents::Service,
        ipc::{Channel, EACCES, EBADF},
    };
    #[test]
    fn inference_arena_authority_is_explicit_and_cannot_escalate() {
        assert_eq!(BOOT[0].validate(0).unwrap().memory_pages(), 0);
        assert_eq!(INFERENCE_BOOT[0].validate(0).unwrap().memory_pages(), 16);
        assert!(
            Definition {
                memory_pages: 17,
                ..INFERENCE_BOOT[0]
            }
            .validate(0)
            .is_err()
        );
        assert!(
            Definition {
                memory_pages: 1,
                ..BOOT[1]
            }
            .validate(1)
            .is_err()
        );
        assert_eq!(
            Definition {
                memory_pages: 3,
                ..INFERENCE_BOOT[0]
            }
            .validate(0)
            .unwrap()
            .memory_pages(),
            3
        );
    }
    #[test]
    fn fresh_roles_expose_only_owned_authority() {
        let mut channel = Channel::EMPTY;
        let handles = channel.start_pair().unwrap();
        let mut documents = Service::EMPTY;
        let grants = documents.start_client().unwrap();
        for pid in 0..2 {
            let f = recovery_frame(pid, 36, 4, handles, grants).unwrap();
            assert_eq!([f.r8, f.r9], handles[pid]);
            assert_eq!(f.r11, if pid == 0 { grants[0] } else { 0 });
            assert_eq!([f.r12, f.r13, f.r15], [pid as u64, 36, 4]);
            assert_eq!(
                [
                    f.r10, f.r14, f.rax, f.rbx, f.rcx, f.rdx, f.rsi, f.rdi, f.rbp
                ],
                [0; 9]
            );
            assert_eq!(channel.send(pid, f.r9, b"x"), Err(EACCES));
            assert_eq!(channel.receive(pid, f.r8, 64), Err(EACCES));
            assert_eq!(channel.send(pid, 0, b"x"), Err(EBADF));
            assert_eq!(channel.send(pid, handles[1 - pid][0], b"x"), Err(EBADF));
            assert_eq!(channel.send(pid, f.r8, b"x"), Ok(1));
        }
    }
    #[test]
    fn invalid_authority_is_rejected_before_process_construction() {
        let h = [[1, 2], [3, 4]];
        for (pid, handles, grants) in [
            (2, h, [5, 0]),
            (0, h, [0, 0]),
            (1, h, [5, 6]),
            (0, [[0, 2], [3, 4]], [5, 0]),
            (1, [[1, 2], [3, 3]], [5, 0]),
        ] {
            assert!(recovery_frame(pid, 33, 0, handles, grants).is_err());
        }
    }
}

#[cfg(test)]
mod policy_tests {
    use super::*;
    #[test]
    fn rejects_authority_and_budget_escalation() {
        for bad in [
            Definition { peer: 0, ..BOOT[0] },
            Definition {
                peer: usize::MAX,
                ..BOOT[0]
            },
            Definition {
                elf: Elf::Service,
                ..BOOT[0]
            },
            Definition {
                document: Some(1),
                ..BOOT[0]
            },
            Definition {
                frames: 0,
                ..BOOT[0]
            },
            Definition {
                frames: 33,
                ..BOOT[0]
            },
            Definition {
                ticks: 0,
                ..BOOT[0]
            },
            Definition {
                ticks: 1025,
                ..BOOT[0]
            },
        ] {
            assert!(bad.validate(0).is_err());
        }
        assert!(
            Definition {
                document: Some(0),
                ..BOOT[1]
            }
            .validate(1)
            .is_err()
        );
        assert!(BOOT[0].validate(2).is_err());
    }
    #[test]
    fn reduced_definition_cannot_receive_an_unrequested_grant() {
        let p = Definition {
            document: None,
            frames: 14,
            ticks: 8,
            ..BOOT[0]
        }
        .validate(0)
        .unwrap();
        assert_eq!((p.frames(), p.ticks(), p.document()), (14, 8, None));
        let h = [[1, 2], [3, 4]];
        assert!(p.frame(36, 0, h, [5, 0]).is_err());
        let f = p.frame(36, 0, h, [0, 0]).unwrap();
        assert_eq!((f.r11, f.r10, f.r14), (0, 0, 0));
    }
}
