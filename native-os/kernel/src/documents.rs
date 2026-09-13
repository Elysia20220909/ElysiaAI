//! Read-only synthetic RAM documents. Requests carry no caller identity: the
//! kernel binds a delivered IPC message to its actual peer before servicing it.
use crate::{
    EINVAL, ENOSYS,
    ipc::{EACCES, EAGAIN, EBADF, EMSGSIZE, Message},
};
pub const SERVICE: usize = 1;
pub const REQUEST_SIZE: usize = 32;
pub const RESPONSE_SIZE: usize = 64;
pub const MAX_READ: usize = RESPONSE_SIZE - 16;
const DOCUMENTS: [&[u8]; 2] = [b"ELYSIA RAM GUIDE\n", b"UNGRANTED TEST DOCUMENT\n"];
#[derive(Clone, Copy)]
struct Grant {
    token: u64,
    generation: u64,
    document: usize,
}
#[derive(Clone, Copy)]
struct Delivery {
    caller: usize,
    message: Message,
}
pub struct Service {
    grants: [Option<Grant>; 2],
    generation: u64,
    next_token: u64,
    pending: Option<Delivery>,
}
impl Service {
    pub const EMPTY: Self = Self {
        grants: [None; 2],
        generation: 0,
        next_token: 0x100,
        pending: None,
    };
    /// Issued by the kernel, never by untrusted requests. No host files are loaded.
    pub fn start_pair(&mut self) -> Result<[u64; 2], u64> {
        if !self.is_clean() {
            return Err(EAGAIN);
        }
        let generation = self.generation.checked_add(1).ok_or(EBADF)?;
        let end = self.next_token.checked_add(2).ok_or(EBADF)?;
        let first = self.next_token;
        self.grants = core::array::from_fn(|pid| {
            Some(Grant {
                token: first + pid as u64,
                generation,
                document: pid,
            })
        });
        self.generation = generation;
        self.next_token = end;
        Ok([first, first + 1])
    }
    pub fn can_receive(&self, pid: usize) -> bool {
        pid != SERVICE || self.pending.is_none()
    }
    /// The caller is kernel-derived channel provenance, not a field in the payload.
    pub fn delivered(
        &mut self,
        receiver: usize,
        caller: usize,
        message: Message,
    ) -> Result<(), u64> {
        if receiver != SERVICE {
            return Ok(());
        }
        if caller >= 2 || caller == receiver {
            return Err(EACCES);
        }
        if self.pending.is_some() {
            return Err(EAGAIN);
        }
        self.pending = Some(Delivery { caller, message });
        Ok(())
    }
    fn grant(&self, caller: usize, token: u64) -> Result<Grant, u64> {
        let grant = self.grants.get(caller).and_then(|g| *g).ok_or(EBADF)?;
        if grant.token != token || grant.generation != self.generation {
            return Err(EBADF);
        }
        Ok(grant)
    }
    fn dispatch(&mut self, delivery: Delivery) -> Result<&'static [u8], u64> {
        if delivery.message.length != REQUEST_SIZE {
            return Err(EINVAL);
        }
        let bytes = &delivery.message.bytes;
        let word = |offset| u64::from_le_bytes(bytes[offset..offset + 8].try_into().unwrap());
        let operation = word(0);
        let token = word(8);
        let offset = word(16);
        let length = word(24);
        let grant = self.grant(delivery.caller, token)?;
        match operation {
            1 => {
                if length > MAX_READ as u64 {
                    return Err(EMSGSIZE);
                }
                let end = offset.checked_add(length).ok_or(EINVAL)?;
                let start = usize::try_from(offset).map_err(|_| EINVAL)?;
                let end = usize::try_from(end).map_err(|_| EINVAL)?;
                DOCUMENTS[grant.document].get(start..end).ok_or(EINVAL)
            }
            2 => {
                if offset != 0 || length != 0 {
                    return Err(EINVAL);
                }
                self.grants[delivery.caller] = None;
                Ok(&[])
            }
            _ => Err(ENOSYS),
        }
    }
    /// Only the service can consume its last delivered request, once. Denied reads
    /// return a fully initialized error response without document bytes.
    pub fn serve(&mut self, pid: usize) -> Result<[u8; RESPONSE_SIZE], u64> {
        if pid != SERVICE {
            return Err(EACCES);
        }
        let request = self.pending.take().ok_or(EAGAIN)?;
        let mut response = [0u8; RESPONSE_SIZE];
        match self.dispatch(request) {
            Ok(bytes) => {
                response[8..16].copy_from_slice(&(bytes.len() as u64).to_le_bytes());
                response[16..16 + bytes.len()].copy_from_slice(bytes);
            }
            Err(error) => response[..8].copy_from_slice(&error.to_le_bytes()),
        }
        Ok(response)
    }
    pub fn close_process(&mut self, pid: usize) {
        if pid == SERVICE {
            self.grants = [None; 2];
            self.pending = None;
        } else if let Some(grant) = self.grants.get_mut(pid) {
            *grant = None;
            if self.pending.is_some_and(|p| p.caller == pid) {
                self.pending = None;
            }
        }
    }
    pub fn is_clean(&self) -> bool {
        self.grants.iter().all(Option::is_none) && self.pending.is_none()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request(op: u64, token: u64, offset: u64, length: u64) -> Message {
        let mut bytes = [0; 64];
        for (index, word) in [op, token, offset, length].into_iter().enumerate() {
            bytes[index * 8..index * 8 + 8].copy_from_slice(&word.to_le_bytes());
        }
        Message {
            bytes,
            length: REQUEST_SIZE,
        }
    }
    fn call(service: &mut Service, message: Message) -> [u8; 64] {
        service.delivered(1, 0, message).unwrap();
        service.serve(1).unwrap()
    }
    fn status(response: [u8; 64]) -> u64 {
        u64::from_le_bytes(response[..8].try_into().unwrap())
    }
    #[test]
    fn read_is_bound_to_actual_caller_and_grant_target() {
        let mut s = Service::EMPTY;
        let h = s.start_pair().unwrap();
        let response = call(&mut s, request(1, h[0], 0, 17));
        assert_eq!(&response[16..33], DOCUMENTS[0]);
        assert_eq!(status(call(&mut s, request(1, h[1], 0, 1))), EBADF);
        assert_eq!(status(call(&mut s, request(1, 0, 0, 1))), EBADF);
    }
    #[test]
    fn service_cannot_read_without_a_delivery_or_replay_one() {
        let mut s = Service::EMPTY;
        let h = s.start_pair().unwrap();
        assert_eq!(s.serve(1), Err(EAGAIN));
        s.delivered(1, 0, request(1, h[0], 0, 1)).unwrap();
        assert_eq!(s.serve(0), Err(EACCES));
        assert!(!s.can_receive(1));
        assert_eq!(s.delivered(1, 0, request(1, h[0], 1, 1)), Err(EAGAIN));
        assert_eq!(s.serve(1).unwrap()[16], b'E');
        assert_eq!(s.serve(1), Err(EAGAIN));
        assert!(s.can_receive(1));
    }
    #[test]
    fn range_validation_covers_end_overflow_and_response_capacity() {
        let mut s = Service::EMPTY;
        let h = s.start_pair().unwrap();
        assert_eq!(status(call(&mut s, request(1, h[0], 17, 0))), 0);
        assert_eq!(status(call(&mut s, request(1, h[0], 18, 0))), EINVAL);
        assert_eq!(status(call(&mut s, request(1, h[0], u64::MAX, 2))), EINVAL);
        assert_eq!(status(call(&mut s, request(1, h[0], 0, 49))), EMSGSIZE);
        assert_eq!(&call(&mut s, request(1, h[0], 7, 3))[16..19], b"RAM");
    }
    #[test]
    fn malformed_and_write_requests_cannot_change_document_bytes() {
        let mut s = Service::EMPTY;
        let h = s.start_pair().unwrap();
        let mut malformed = request(1, h[0], 0, 1);
        malformed.length = 31;
        assert_eq!(status(call(&mut s, malformed)), EINVAL);
        assert_eq!(status(call(&mut s, request(3, h[0], 0, 1))), ENOSYS);
        assert_eq!(&call(&mut s, request(1, h[0], 0, 17))[16..33], DOCUMENTS[0]);
    }
    #[test]
    fn revoked_and_previous_lifetime_handles_never_regain_access() {
        let mut s = Service::EMPTY;
        let old = s.start_pair().unwrap();
        assert_eq!(status(call(&mut s, request(2, old[1], 0, 0))), EBADF);
        assert_eq!(status(call(&mut s, request(2, old[0], 0, 0))), 0);
        let denied = call(&mut s, request(1, old[0], 0, 1));
        assert_eq!(status(denied), EBADF);
        assert_eq!(&denied[8..], &[0; 56]);
        s.close_process(0);
        s.close_process(1);
        assert!(s.is_clean());
        let new = s.start_pair().unwrap();
        assert_ne!(old, new);
        assert_eq!(status(call(&mut s, request(1, old[0], 0, 1))), EBADF);
        assert_eq!(status(call(&mut s, request(1, new[0], 0, 1))), 0);
    }
    #[test]
    fn departure_discards_pending_work_and_grants() {
        for departed in [0, 1] {
            let mut s = Service::EMPTY;
            let h = s.start_pair().unwrap();
            s.delivered(1, 0, request(1, h[0], 0, 1)).unwrap();
            s.close_process(departed);
            assert_eq!(s.serve(1), Err(EAGAIN));
            s.close_process(1 - departed);
            assert!(s.is_clean());
        }
    }
    #[test]
    fn repeated_lifetimes_and_exhaustion_are_bounded() {
        let mut s = Service::EMPTY;
        for _ in 0..64 {
            let h = s.start_pair().unwrap();
            s.delivered(1, 0, request(1, h[0], 0, 1)).unwrap();
            s.close_process(1);
            s.close_process(0);
            assert!(s.is_clean());
        }
        s.next_token = u64::MAX;
        assert_eq!(s.start_pair(), Err(EBADF));
        assert!(s.is_clean());
        s.next_token = 0x100;
        s.generation = u64::MAX;
        assert_eq!(s.start_pair(), Err(EBADF));
        assert!(s.is_clean());
    }
}
