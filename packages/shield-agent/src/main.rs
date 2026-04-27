use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

mod validator;
use validator::SovereigntyValidator;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct AuditLog {
    id: String,
    timestamp: String,
    #[serde(rename = "ipAddress")]
    ip_address: String,
    #[serde(rename = "statusCode")]
    status_code: i32,
    action: String,
    input: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct DefenseRules {
    blocked_ips: Vec<String>,
    last_updated: u64,
}

fn main() {
    let log_file = std::env::var("SHIELD_LOG_FILE").unwrap_or_else(|_| "logs/audit/audit.jsonl".to_string());
    let rules_file = std::env::var("SHIELD_RULES_FILE").unwrap_or_else(|_| "config/defense/rules.json".to_string());
    let threshold: i32 = std::env::var("SHIELD_THRESHOLD")
        .unwrap_or_else(|_| "5".to_string())
        .parse()
        .unwrap_or(5);

    println!("🛡️ ElysiaAI Shield Agent v0.2.0 - Active Defense Mode");
    println!("Watching: {}", log_file);

    // Ensure defense directory exists
    if let Some(parent) = Path::new(&rules_file).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).ok();
        }
    }

    let mut last_processed_line = 0;
    let mut attack_counter: HashMap<String, i32> = HashMap::new();
    let validator = SovereigntyValidator::new();

    loop {
        if Path::new(&log_file).exists() {
            if let Ok(file) = File::open(&log_file) {
                let reader = BufReader::new(file);
                let current_lines: Vec<String> = reader.lines().filter_map(|l| l.ok()).collect();
                
                if current_lines.len() > last_processed_line {
                    for line in &current_lines[last_processed_line..] {
                        if let Ok(log) = serde_json::from_str::<AuditLog>(line) {
                            // 1. Semantic Validation (Luna Integration)
                            if let Some(ref input) = log.input {
                                if let Err(e) = validator.validate(input) {
                                    println!("[SOVEREIGNTY_VIOLATION] Detected on IP: {}. Error: {}", log.ip_address, e);
                                    update_defense_rules(&log.ip_address, &rules_file);
                                    continue; // Move to next log
                                }
                            }

                            // 2. Behavioral Validation (Brute Force)
                            if log.status_code == 401 || log.action == "error" {
                                let count = attack_counter.entry(log.ip_address.clone()).or_insert(0);
                                *count += 1;
                                
                                if *count >= threshold {
                                    println!("[ALERT] Brute-force detected from IP: {}. Blocking...", log.ip_address);
                                    update_defense_rules(&log.ip_address, &rules_file);
                                    // Reset counter after blocking to avoid redundant updates
                                    *count = -100; 
                                }
                            }
                        }
                    }
                    last_processed_line = current_lines.len();
                }
            }
        }
        
        thread::sleep(Duration::from_millis(2000));
    }
}

fn update_defense_rules(ip: &str, rules_file: &str) {
    let mut rules = if Path::new(rules_file).exists() {
        let content = fs::read_to_string(rules_file).unwrap_or_else(|_| "{}".to_string());
        serde_json::from_str::<DefenseRules>(&content).unwrap_or(DefenseRules {
            blocked_ips: Vec::new(),
            last_updated: 0,
        })
    } else {
        DefenseRules {
            blocked_ips: Vec::new(),
            last_updated: 0,
        }
    };

    if !rules.blocked_ips.contains(&ip.to_string()) {
        rules.blocked_ips.push(ip.to_string());
        rules.last_updated = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        if let Ok(json) = serde_json::to_string_pretty(&rules) {
            let mut file = OpenOptions::new()
                .create(true)
                .write(true)
                .truncate(true)
                .open(rules_file)
                .ok();
            if let Some(mut f) = file {
                f.write_all(json.as_bytes()).ok();
            }
        }
    }
}
