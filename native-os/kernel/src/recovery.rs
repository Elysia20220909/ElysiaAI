//! Bounded restart policy and unpublished connection replacement.
use crate::{
    documents::Service,
    ipc::{Channel, EACCES, EAGAIN},
};
pub const MAX_RESTARTS: u64 = 8;
pub const CONNECTION_SIZE: u64 = 24;
pub const ENOMEM: u64 = (-12i64) as u64;
#[derive(Clone, Copy)]
pub struct Supervisor {
    pub generation: u64,
}
impl Supervisor {
    pub const NEW: Self = Self { generation: 0 };
    pub fn next(&self, caller: usize, service_present: bool) -> Result<u64, u64> {
        if caller != 0 {
            return Err(EACCES);
        }
        if service_present || self.generation >= MAX_RESTARTS {
            return Err(EAGAIN);
        }
        self.generation.checked_add(1).ok_or(EAGAIN)
    }
}
pub struct Replacement {
    pub channel: Channel,
    pub documents: Service,
    pub handles: [[u64; 2]; 2],
    pub grants: [u64; 2],
}
/// Construct new authority without modifying the live session. The caller only
/// publishes this replacement after the new address space has been built.
pub fn replacement(channel: &Channel, documents: &Service) -> Result<Replacement, u64> {
    if !channel.service_departed() || !documents.is_clean() {
        return Err(EAGAIN);
    }
    let mut channel = channel.clone();
    let mut documents = documents.clone();
    channel.close_process(0); // Retire the old connection, not the surviving process.
    let handles = channel.start_pair()?;
    let grants = documents.start_pair()?;
    Ok(Replacement {
        channel,
        documents,
        handles,
        grants,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::ipc::{EBADF, EPIPE};
    #[test]
    fn only_client_can_restart_a_departed_service_within_budget() {
        let mut s = Supervisor::NEW;
        assert_eq!(s.next(1, false), Err(EACCES));
        assert_eq!(s.next(0, true), Err(EAGAIN));
        for generation in 1..=MAX_RESTARTS {
            assert_eq!(s.next(0, false), Ok(generation));
            s.generation = generation;
        }
        assert_eq!(s.next(0, false), Err(EAGAIN));
        s.generation = u64::MAX;
        assert_eq!(s.next(0, false), Err(EAGAIN));
    }
    #[test]
    fn staging_and_discarding_replacement_does_not_reopen_live_channel() {
        let mut c = Channel::EMPTY;
        let mut d = Service::EMPTY;
        let old = c.start_pair().unwrap();
        d.start_pair().unwrap();
        assert!(replacement(&c, &d).is_err());
        c.close_process(1);
        d.close_process(1);
        let staged = replacement(&c, &d).unwrap();
        assert_eq!(c.send(0, old[0][0], b"x"), Err(EPIPE));
        assert!(d.is_clean());
        assert!(staged.channel.is_open());
        // Discarding the candidate consumes neither a generation nor a handle.
        assert_eq!(replacement(&c, &d).unwrap().handles, staged.handles);
    }
    #[test]
    fn replacement_rejects_old_handles_and_discards_queued_requests() {
        let mut c = Channel::EMPTY;
        let mut d = Service::EMPTY;
        let old = c.start_pair().unwrap();
        let grants = d.start_pair().unwrap();
        c.send(0, old[0][0], b"old").unwrap();
        c.close_process(1);
        d.close_process(1);
        let mut new = replacement(&c, &d).unwrap();
        assert_ne!(new.grants, grants);
        assert_eq!(new.channel.send(0, old[0][0], b"x"), Err(EBADF));
        assert_eq!(new.channel.receive(0, old[0][1], 64), Err(EBADF));
        assert_eq!(new.channel.receive(1, new.handles[1][1], 64), Ok(None));
        new.channel.send(0, new.handles[0][0], b"new").unwrap();
        assert_eq!(
            new.channel
                .receive(1, new.handles[1][1], 64)
                .unwrap()
                .unwrap()
                .length,
            3
        );
    }
}
