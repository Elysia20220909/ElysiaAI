//! Strict, bounded operator command parsing. The console is a trusted control plane.
#[derive(Debug, PartialEq, Eq)]
pub enum Decision {
    Approve,
    Deny,
}
pub fn parse(line: &[u8], expected: u64) -> Option<Decision> {
    let (decision, digits) = if let Some(s) = line.strip_prefix(b"approve ") {
        (Decision::Approve, s)
    } else if let Some(s) = line.strip_prefix(b"deny ") {
        (Decision::Deny, s)
    } else {
        return None;
    };
    if digits.is_empty() || digits[0] == b'0' {
        return None;
    }
    let mut id = 0u64;
    for &digit in digits {
        if !digit.is_ascii_digit() {
            return None;
        }
        id = id.checked_mul(10)?.checked_add((digit - b'0') as u64)?;
    }
    (id == expected).then_some(decision)
}

/// A single console line, bounded in memory and in scheduler ticks.
/// Terminal outcomes consume the session, including malformed or late input.
pub struct Session {
    expected: u64,
    until: u64,
    bytes: [u8; 32],
    len: usize,
    finished: bool,
}
#[derive(Debug, PartialEq, Eq)]
pub enum Outcome {
    Pending,
    Decision(Decision),
    Invalid,
    Timeout,
    Consumed,
}
impl Session {
    pub fn new(expected: u64, until: u64) -> Self {
        Self {
            expected,
            until,
            bytes: [0; 32],
            len: 0,
            finished: false,
        }
    }
    pub fn poll(&mut self, now: u64, byte: Option<u8>) -> Outcome {
        let outcome = if self.finished {
            Outcome::Consumed
        } else if now >= self.until {
            Outcome::Timeout
        } else if let Some(byte) = byte {
            if byte == b'\n' || byte == b'\r' {
                parse(&self.bytes[..self.len], self.expected)
                    .map_or(Outcome::Invalid, Outcome::Decision)
            } else if self.len == self.bytes.len() || !(0x20..=0x7e).contains(&byte) {
                Outcome::Invalid
            } else {
                self.bytes[self.len] = byte;
                self.len += 1;
                Outcome::Pending
            }
        } else {
            Outcome::Pending
        };
        if outcome != Outcome::Pending {
            self.finished = true;
        }
        outcome
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn late_newline_cannot_approve_and_session_cannot_be_reused() {
        let mut session = Session::new(1, 5);
        for &byte in b"approve 1" {
            assert_eq!(session.poll(4, Some(byte)), Outcome::Pending);
        }
        assert_eq!(session.poll(5, Some(b'\n')), Outcome::Timeout);
        assert_eq!(session.poll(4, Some(b'\n')), Outcome::Consumed);
    }
    #[test]
    fn partial_input_yields_and_terminal_decision_is_single_use() {
        let mut session = Session::new(1, 10);
        for &byte in b"approve 1" {
            assert_eq!(session.poll(1, Some(byte)), Outcome::Pending);
        }
        assert_eq!(session.poll(2, None), Outcome::Pending);
        assert_eq!(
            session.poll(3, Some(b'\n')),
            Outcome::Decision(Decision::Approve)
        );
        assert_eq!(session.poll(4, Some(b'\n')), Outcome::Consumed);
    }
    #[test]
    fn oversized_or_control_input_and_silent_timeout_fail_closed() {
        let mut session = Session::new(1, 10);
        for _ in 0..32 {
            assert_eq!(session.poll(1, Some(b'a')), Outcome::Pending);
        }
        assert_eq!(session.poll(1, Some(b'a')), Outcome::Invalid);
        assert_eq!(Session::new(1, 10).poll(1, Some(0)), Outcome::Invalid);
        assert_eq!(Session::new(1, 10).poll(10, None), Outcome::Timeout);
    }
    #[test]
    fn exact_id_and_verb_only() {
        assert_eq!(parse(b"approve 1", 1), Some(Decision::Approve));
        assert_eq!(parse(b"deny 42", 42), Some(Decision::Deny));
        for line in [
            b"approve 2".as_slice(),
            b"approve 01",
            b"approve -1",
            b"approve 1 extra",
            b"approve 18446744073709551616",
            b"approve ",
            b"APPROVE 1",
            b"approve 1\n",
        ] {
            assert_eq!(parse(line, 1), None);
        }
    }
}
