//! Recovery-role register contract. Tokens authorize nothing without kernel ownership checks.
use crate::Frame;
/// Fresh registers contain only this process's communication handles and the client's grant.
/// R12/R13/R15 are fixture identity/mode/generation, not authority. Other GPRs remain zero.
pub fn recovery_frame(
    pid: usize,
    mode: u32,
    generation: u64,
    handles: [[u64; 2]; 2],
    grants: [u64; 2],
) -> Result<Frame, &'static str> {
    if pid >= 2 || grants[0] == 0 || grants[1] != 0 {
        return Err("launch-authority");
    }
    let [send, receive] = handles[pid];
    if send == 0 || receive == 0 || send == receive {
        return Err("launch-handles");
    }
    Ok(Frame {
        r8: send,
        r9: receive,
        r11: if pid == 0 { grants[0] } else { 0 },
        r12: pid as u64,
        r13: mode as u64,
        r15: generation,
        ..Frame::EMPTY
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        documents::Service,
        ipc::{Channel, EACCES, EBADF},
    };
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
