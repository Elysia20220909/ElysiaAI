use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize, Debug, Clone)]
struct AuditLog {
    id: String,
    timestamp: String,
    #[serde(rename = "ipAddress")]
    ip_address: String,
    #[serde(rename = "statusCode")]
    status_code: i32,
    action: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct DefenseRules {
    blocked_ips: Vec<String>,
    last_updated: u64,
}

const LOG_FILE: &str = "/app/logs/audit/audit.jsonl";
const RULES_FILE: &str = "/app/config/defense/rules.json";
const THRESHOLD: i32 = 5; // Number of failures to trigger block

fn main() {
    println!("🛡️ ElysiaAI Shield Agent v0.2.0 - Active Defense Mode");
    println!("Watching: {}", LOG_FILE);

    // Ensure defense directory exists
    let defense_dir = Path::new(RULES_FILE).parent().unwrap();
    if !defense_dir.exists() {
        fs::create_dir_all(defense_dir).ok();
    }

    let mut last_processed_line = 0;
    let mut attack_counter: HashMap<String, i32> = HashMap::new();

    loop {
        if Path::new(LOG_FILE).exists() {
            if let Ok(file) = File::open(LOG_FILE) {
                let reader = BufReader::new(file);
                let current_lines: Vec<String> = reader.lines().filter_map(|l| l.ok()).collect();
                
                if current_lines.len() > last_processed_line {
                    for line in &current_lines[last_processed_line..] {
                        if let Ok(log) = serde_json::from_str::<AuditLog>(line) {
                            if log.status_code == 401 || log.action == "error" {
                                let count = attack_counter.entry(log.ip_address.clone()).or_insert(0);
                                *count += 1;
                                
                                if *count >= THRESHOLD {
                                    println!("[ALERT] Brute-force detected from IP: {}. Blocking...", log.ip_address);
                                    update_defense_rules(&log.ip_address);
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

fn update_defense_rules(ip: &str) {
    let mut rules = if Path::new(RULES_FILE).exists() {
        let content = fs::read_to_string(RULES_FILE).unwrap_or_else(|_| "{}".to_string());
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
                .open(RULES_FILE)
                .ok();
            if let Some(mut f) = file {
                f.write_all(json.as_bytes()).ok();
            }
        }
    }
}
