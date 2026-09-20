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
#[derive(Clone)]
pub struct Service {
    pub work: crate::operations::Manager,
    checkpoint: Option<fn(&crate::operations::Manager)>,
    fixture: u32,
    now: u64,
    grants: [Option<Grant>; 2],
    generation: u64,
    next_token: u64,
    pending: Option<Delivery>,
    definition: Option<[crate::launch::Definition; 2]>,
}
impl Service {
    pub const EMPTY: Self = Self {
        work: crate::operations::Manager::EMPTY,
        checkpoint: None,
        fixture: 0,
        now: 0,
        grants: [None; 2],
        generation: 0,
        next_token: 0x100,
        pending: None,
        definition: None,
    };
    pub fn set_checkpoint(&mut self, hook: fn(&crate::operations::Manager)) {
        self.checkpoint = Some(hook);
    }
    fn record_checkpoint(&self) {
        if let Some(hook) = self.checkpoint {
            hook(&self.work);
        }
    }
    /// Boot-test approval source only. There is no guest API for setting this.
    pub fn enable_operation_fixture(&mut self, mode: u32) {
        self.fixture = mode;
    }
    pub fn serve_at(&mut self, pid: usize, now: u64) -> Result<[u8; RESPONSE_SIZE], u64> {
        self.now = now;
        self.serve(pid)
    }
    fn operation(
        &mut self,
        caller: usize,
        opcode: u64,
        token: u64,
        offset: u64,
        length: u64,
        document: usize,
    ) -> Result<&'static [u8], u64> {
        use crate::operations::Plan;
        let plan = Plan {
            id: 1,
            caller,
            executor: SERVICE,
            version: 1,
            target: token,
            offset,
            length,
            byte_budget: 16,
            deadline: 1024,
        };
        match opcode {
            10 => {
                self.work
                    .propose(caller, plan, self.now)
                    .map_err(|_| EACCES)?;
                self.record_checkpoint();
                // Exact scripted human decision, not the submitted plan or an AI decision.
                let approved = Plan {
                    id: 1,
                    caller: 0,
                    executor: SERVICE,
                    version: 1,
                    target: self.grants[0].ok_or(EBADF)?.token,
                    offset: if self.fixture == 49 { 999 } else { 0 },
                    length: 16,
                    byte_budget: 16,
                    deadline: 1024,
                };
                self.work
                    .approve(approved, self.fixture != 46, self.now)
                    .map_err(|_| EACCES)?;
                self.record_checkpoint();
                Ok(&[])
            }
            11 => {
                self.work
                    .begin(caller, plan, self.now)
                    .map_err(|_| EACCES)?;
                self.record_checkpoint();
                let result = offset
                    .checked_add(length)
                    .and_then(|end| usize::try_from(offset).ok().zip(usize::try_from(end).ok()))
                    .and_then(|(start, end)| DOCUMENTS[document].get(start..end))
                    .ok_or(EINVAL);
                // Fault fixture leaves Running until the actual service fault is observed.
                if self.fixture != 48 {
                    self.work
                        .finish(SERVICE, result.is_ok(), self.now)
                        .map_err(|_| EACCES)?;
                    self.record_checkpoint();
                }
                result
            }
            12 => {
                self.work.interrupt(self.now).map_err(|_| EACCES)?;
                Ok(&[])
            }
            _ => Err(ENOSYS),
        }
    }
    /// Issued by the kernel, never by untrusted requests. No host files are loaded.
    pub fn start_pair(&mut self) -> Result<[u64; 2], u64> {
        let grants = self.start([Some(0), Some(1)])?;
        self.definition = None;
        Ok(grants)
    }
    /// Recovery services only dispatch client requests; they receive no document grant.
    pub fn start_client(&mut self) -> Result<[u64; 2], u64> {
        self.start_defined(crate::launch::BOOT)
    }
    pub fn start_defined(
        &mut self,
        definitions: [crate::launch::Definition; 2],
    ) -> Result<[u64; 2], u64> {
        let validated = crate::launch::validate_pair(definitions).map_err(|_| EACCES)?;
        if self
            .definition
            .is_some_and(|previous| previous != definitions)
        {
            return Err(EACCES);
        }
        let grants = self.start(validated.map(|definition| definition.document()))?;
        self.definition = Some(definitions);
        Ok(grants)
    }
    fn start(&mut self, targets: [Option<usize>; 2]) -> Result<[u64; 2], u64> {
        if !self.is_clean() {
            return Err(EAGAIN);
        }
        let generation = self.generation.checked_add(1).ok_or(EBADF)?;
        let end = self.next_token.checked_add(2).ok_or(EBADF)?;
        let first = self.next_token;
        self.grants = core::array::from_fn(|pid| {
            let document = targets[pid]?;
            Some(Grant {
                token: first + pid as u64,
                generation,
                document,
            })
        });
        self.generation = generation;
        self.next_token = end;
        Ok(core::array::from_fn(|pid| {
            if targets[pid].is_some() {
                first + pid as u64
            } else {
                0
            }
        }))
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
        if self.fixture != 0 {
            return self.operation(
                delivery.caller,
                operation,
                token,
                offset,
                length,
                grant.document,
            );
        }
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
    pub fn close_process_at(&mut self, pid: usize, now: u64) {
        self.now = now;
        self.close_process(pid);
    }
    pub fn close_process(&mut self, pid: usize) {
        if self.fixture != 0 {
            let _ = self.work.interrupt(self.now);
        }
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
    fn client_only_lifetimes_never_issue_a_service_grant() {
        let mut s = Service::EMPTY;
        let mut old = 0;
        for _ in 0..9 {
            let h = s.start_client().unwrap();
            assert_ne!(h[0], 0);
            assert_eq!(h[1], 0);
            assert!(s.grants[SERVICE].is_none());
            assert!(s.grant(SERVICE, h[0]).is_err());
            assert!(s.grant(SERVICE, h[0] + 1).is_err());
            assert_eq!(s.serve(SERVICE), Err(EAGAIN));
            for denied in [0, old, h[0] + 1] {
                let response = call(&mut s, request(1, denied, 0, 17));
                assert_eq!(u64::from_le_bytes(response[..8].try_into().unwrap()), EBADF);
                assert_eq!(&response[8..], &[0; 56]);
            }
            assert_eq!(&call(&mut s, request(1, h[0], 0, 17))[16..33], DOCUMENTS[0]);
            old = h[0];
            s.close_process(SERVICE);
            assert!(s.is_clean());
        }
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
