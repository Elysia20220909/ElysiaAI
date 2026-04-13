use strsim::damerau_levenshtein;
use shlex::split;

pub struct SovereigntyValidator {
    forbidden_commands: Vec<&'static str>,
    dangerous_paths: Vec<&'static str>,
    near_match_threshold: usize,
}

impl SovereigntyValidator {
    pub fn new() -> Self {
        Self {
            forbidden_commands: vec!["rm", "chmod", "chown", "dd", "mkfs", "mount", "umount", "sh", "bash", "nc", "netcat"],
            dangerous_paths: vec!["/etc", "/bin", "/sbin", "/usr/bin", "/root", "/var/log"],
            near_match_threshold: 2,
        }
    }

    /// Validates a command string for sovereignty violations.
    /// Returns Ok(()) if safe, or Err(String) with a description of the violation.
    pub fn validate(&self, cmd_str: &str) -> Result<(), String> {
        let segments = match split(cmd_str) {
            Some(s) => s,
            None => return Err("Failed to parse command segments (possible shell injection)".to_string()),
        };

        if segments.is_empty() {
            return Ok(());
        }

        let main_cmd = &segments[0];

        // 1. Exact Match Check
        if self.forbidden_commands.contains(&main_cmd.as_str()) {
            return Err(format!("Direct sovereignty violation: Command '{}' is restricted.", main_cmd));
        }

        // 2. Near Match Check (Luna-inspired Damerau-Levenshtein)
        for forbidden in &self.forbidden_commands {
            let dist = damerau_levenshtein(main_cmd, forbidden);
            if dist > 0 && dist <= self.near_match_threshold {
                return Err(format!(
                    "Near-match threat detected: '{}' is too similar to restricted command '{}'.",
                    main_cmd, forbidden
                ));
            }
        }

        // 3. Path & Argument Check (Dry-run Logic)
        for arg in &segments[1..] {
            for dangerous in &self.dangerous_paths {
                if arg.contains(dangerous) {
                    return Err(format!("Unauthorized path access detected: '{}' targets '{}'.", cmd_str, dangerous));
                }
            }
            
            // Check for recursive flags on sensitive commands
            if (main_cmd == "rm" || main_cmd == "chmod") && (arg == "-rf" || arg == "-R" || arg == "--recursive") {
                 return Err(format!("Recursive destruction protocol blocked: '{}'.", cmd_str));
            }
        }

        Ok(())
    }
}
