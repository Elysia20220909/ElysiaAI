//! One bounded RAM operation. Approval is a trusted control-plane input, never an agent claim.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Plan {
    pub id: u64,
    pub caller: usize,
    pub executor: usize,
    pub version: u32,
    pub target: u64,
    pub offset: u64,
    pub length: u64,
    pub byte_budget: u64,
    pub deadline: u64,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum State {
    Empty,
    Proposed,
    Approved,
    Running,
    Completed,
    Denied,
    Failed,
    Interrupted,
    Unknown,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Error {
    Invalid,
    Authority,
    Changed,
    State,
    Expired,
    JournalFull,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Event {
    pub id: u64,
    pub state: State,
    pub tick: u64,
}
#[derive(Clone)]
pub struct Manager {
    plan: Option<Plan>,
    state: State,
    events: [Option<Event>; 8],
    count: usize,
    executions: u64,
}
impl Manager {
    pub const EMPTY: Self = Self {
        plan: None,
        state: State::Empty,
        events: [None; 8],
        count: 0,
        executions: 0,
    };
    pub fn plan(&self) -> Option<Plan> {
        self.plan
    }
    pub fn state(&self) -> State {
        self.state
    }
    pub fn events(&self) -> &[Option<Event>] {
        &self.events[..self.count]
    }
    pub fn executions(&self) -> u64 {
        self.executions
    }
    fn record(&mut self, state: State, tick: u64) -> Result<(), Error> {
        if self.count == self.events.len() {
            return Err(Error::JournalFull);
        }
        self.events[self.count] = Some(Event {
            id: self.plan.ok_or(Error::State)?.id,
            state,
            tick,
        });
        self.count += 1;
        self.state = state;
        Ok(())
    }
    pub fn propose(&mut self, caller: usize, plan: Plan, now: u64) -> Result<(), Error> {
        if caller != 0 || plan.caller != caller || plan.executor != 1 {
            return Err(Error::Authority);
        }
        if self.state != State::Empty {
            return Err(Error::State);
        }
        if plan.id == 0
            || plan.version != 1
            || plan.target == 0
            || plan.length == 0
            || plan.byte_budget > 48
            || plan.length > plan.byte_budget
            || plan.offset.checked_add(plan.length).is_none()
        {
            return Err(Error::Invalid);
        }
        if now >= plan.deadline {
            return Err(Error::Expired);
        }
        self.plan = Some(plan);
        self.record(State::Proposed, now)
    }
    /// Called only by trusted approval input. No guest approval syscall exists.
    pub fn approve(&mut self, exact: Plan, allow: bool, now: u64) -> Result<(), Error> {
        if self.state != State::Proposed {
            return Err(Error::State);
        }
        if self.plan != Some(exact) {
            return Err(Error::Changed);
        }
        if now >= exact.deadline {
            return Err(Error::Expired);
        }
        self.record(
            if allow {
                State::Approved
            } else {
                State::Denied
            },
            now,
        )
    }
    pub fn begin(&mut self, caller: usize, exact: Plan, now: u64) -> Result<(), Error> {
        if caller != 0 {
            return Err(Error::Authority);
        }
        if self.state != State::Approved {
            return Err(Error::State);
        }
        if self.plan != Some(exact) {
            return Err(Error::Changed);
        }
        if now >= exact.deadline {
            self.record(State::Interrupted, now)?;
            return Err(Error::Expired);
        }
        // Reserve completion evidence before permitting the operation.
        if self.count + 2 > self.events.len() {
            return Err(Error::JournalFull);
        }
        self.record(State::Running, now)?;
        self.executions += 1;
        Ok(())
    }
    pub fn finish(&mut self, executor: usize, success: bool, now: u64) -> Result<(), Error> {
        if executor != 1 {
            return Err(Error::Authority);
        }
        if self.state != State::Running {
            return Err(Error::State);
        }
        self.record(
            if success {
                State::Completed
            } else {
                State::Failed
            },
            now,
        )
    }
    pub fn interrupt(&mut self, now: u64) -> Result<(), Error> {
        match self.state {
            State::Proposed | State::Approved => self.record(State::Interrupted, now),
            State::Running => self.record(State::Unknown, now),
            _ => Ok(()),
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    const PLAN: Plan = Plan {
        id: 1,
        caller: 0,
        executor: 1,
        version: 1,
        target: 256,
        offset: 0,
        length: 16,
        byte_budget: 16,
        deadline: 20,
    };
    #[test]
    fn approval_binds_every_field_and_only_executes_once() {
        let mut m = Manager::EMPTY;
        m.propose(0, PLAN, 0).unwrap();
        assert_eq!(m.begin(0, PLAN, 1), Err(Error::State));
        m.approve(PLAN, true, 1).unwrap();
        for changed in [
            Plan { id: 2, ..PLAN },
            Plan { caller: 1, ..PLAN },
            Plan {
                executor: 0,
                ..PLAN
            },
            Plan { version: 2, ..PLAN },
            Plan {
                target: 257,
                ..PLAN
            },
            Plan { offset: 1, ..PLAN },
            Plan { length: 8, ..PLAN },
            Plan {
                byte_budget: 32,
                ..PLAN
            },
            Plan {
                deadline: 21,
                ..PLAN
            },
        ] {
            assert_eq!(m.begin(0, changed, 2), Err(Error::Changed));
        }
        assert_eq!(m.begin(1, PLAN, 2), Err(Error::Authority));
        m.begin(0, PLAN, 2).unwrap();
        assert_eq!(m.finish(0, true, 3), Err(Error::Authority));
        m.finish(1, true, 3).unwrap();
        assert_eq!(m.begin(0, PLAN, 4), Err(Error::State));
        assert_eq!(m.propose(0, PLAN, 4), Err(Error::State));
        assert_eq!(m.executions(), 1);
        for (event, expected) in m.events().iter().zip([
            State::Proposed,
            State::Approved,
            State::Running,
            State::Completed,
        ]) {
            assert_eq!(event.unwrap().state, expected);
        }
    }
    #[test]
    fn denial_expiry_failure_and_lost_result_remain_distinct() {
        for (allow, start, finish, expected) in [
            (false, false, false, State::Denied),
            (true, false, false, State::Interrupted),
            (true, true, false, State::Unknown),
            (true, true, true, State::Failed),
        ] {
            let mut m = Manager::EMPTY;
            m.propose(0, PLAN, 0).unwrap();
            m.approve(PLAN, allow, 1).unwrap();
            if start {
                m.begin(0, PLAN, 2).unwrap();
            }
            if finish {
                m.finish(1, false, 3).unwrap();
            } else {
                m.interrupt(3).unwrap();
            }
            assert_eq!(m.state(), expected);
            assert!(m.begin(0, PLAN, 4).is_err());
        }
        let mut m = Manager::EMPTY;
        m.propose(0, PLAN, 0).unwrap();
        m.approve(PLAN, true, 1).unwrap();
        assert_eq!(m.begin(0, PLAN, 20), Err(Error::Expired));
        assert_eq!(m.state(), State::Interrupted);
        assert_eq!(m.executions(), 0);
    }
    #[test]
    fn invalid_and_over_budget_proposals_leave_no_record() {
        for plan in [
            Plan { length: 17, ..PLAN },
            Plan {
                byte_budget: 49,
                ..PLAN
            },
            Plan {
                offset: u64::MAX,
                ..PLAN
            },
            Plan { version: 2, ..PLAN },
        ] {
            let mut m = Manager::EMPTY;
            assert!(m.propose(0, plan, 0).is_err());
            assert!(m.events().is_empty());
        }
        let mut m = Manager::EMPTY;
        m.propose(0, PLAN, 0).unwrap();
        assert_eq!(
            m.approve(Plan { length: 8, ..PLAN }, true, 1),
            Err(Error::Changed)
        );
        m.approve(PLAN, true, 1).unwrap();
        m.count = 7;
        assert_eq!(m.begin(0, PLAN, 2), Err(Error::JournalFull));
        assert_eq!(m.executions(), 0);
    }
}
