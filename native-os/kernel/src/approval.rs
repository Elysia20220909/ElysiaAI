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
#[cfg(test)]
mod tests {
    use super::*;
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
