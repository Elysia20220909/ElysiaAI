use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

#[cfg(target_os = "macos")]
use std::ffi::{CStr, CString};
#[cfg(target_os = "macos")]
use std::os::raw::c_char;

const MAX_FIELD_BYTES: usize = 6_144;
const SWIFT_ADVISORY_BUFFER_BYTES: usize = 10_240;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsibleGuardReport {
    pub codename: String,
    pub generated_at: u64,
    pub mode: String,
    pub decision: String,
    pub summary: String,
    pub risk_score: u8,
    pub confidence_score: u8,
    pub context_hash: String,
    pub action_hash: String,
    pub context_excerpt: String,
    pub action_excerpt: String,
    pub swift_advisory: String,
    pub signals: Vec<ResponsibleSignal>,
    pub boundaries: Vec<ResponsibleBoundary>,
    pub controls: Vec<ResponsibleControl>,
    pub redactions: Vec<ResponsibleRedaction>,
    pub escalations: Vec<ResponsibleEscalation>,
    pub audit: Vec<ResponsibleAuditItem>,
    pub metrics: Vec<ResponsibleMetric>,
    pub next_actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsibleSignal {
    pub id: String,
    pub label: String,
    pub category: String,
    pub severity: String,
    pub hits: Vec<String>,
    pub risk_points: i32,
    pub confidence_points: i32,
    pub policy: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsibleBoundary {
    pub id: String,
    pub label: String,
    pub from_zone: String,
    pub to_zone: String,
    pub risk: String,
    pub required_control: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsibleControl {
    pub id: String,
    pub label: String,
    pub applies_to: Vec<String>,
    pub strength: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsibleRedaction {
    pub id: String,
    pub target: String,
    pub reason: String,
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsibleEscalation {
    pub id: String,
    pub trigger: String,
    pub owner: String,
    pub instruction: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsibleAuditItem {
    pub id: String,
    pub event: String,
    pub retained: String,
    pub omitted: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsibleMetric {
    pub id: String,
    pub label: String,
    pub value: String,
    pub band: String,
}

#[derive(Debug, Clone)]
struct SignalBlueprint {
    id: &'static str,
    label: &'static str,
    category: &'static str,
    markers: &'static [&'static str],
    risk_points: i32,
    confidence_points: i32,
    policy: &'static str,
    control_id: &'static str,
}

#[derive(Debug, Clone)]
struct ContextProfile {
    context: String,
    action: String,
    combined: String,
    context_hash: String,
    action_hash: String,
    context_excerpt: String,
    action_excerpt: String,
    bytes: usize,
    words: usize,
    entropy: f64,
    imperative_density: f64,
}

const SIGNALS: &[SignalBlueprint] = &[
    SignalBlueprint {
        id: "secret-material",
        label: "Secret or credential material",
        category: "privacy",
        markers: &[
            "api key",
            "apikey",
            "token",
            "secret",
            "password",
            "credential",
            "webhook",
            ".env",
            "jwt",
            "signing secret",
        ],
        risk_points: 28,
        confidence_points: 13,
        policy: "Secrets must stay out of prompts, logs, commits, and outbound messages.",
        control_id: "redact-secrets",
    },
    SignalBlueprint {
        id: "personal-data",
        label: "Personal data",
        category: "privacy",
        markers: &[
            "personal",
            "private",
            "email",
            "phone",
            "address",
            "profile",
            "chat history",
            "chat log",
            "user data",
            "document",
        ],
        risk_points: 22,
        confidence_points: 9,
        policy: "Personal data requires consent, minimization, and retention limits.",
        control_id: "minimize-personal-data",
    },
    SignalBlueprint {
        id: "rag-injection",
        label: "RAG prompt injection boundary",
        category: "ai-safety",
        markers: &[
            "rag",
            "retrieved",
            "embedding",
            "milvus",
            "knowledge",
            "ignore previous",
            "system prompt",
            "developer message",
            "override",
        ],
        risk_points: 24,
        confidence_points: 10,
        policy:
            "Retrieved content is reference data and cannot override higher-priority instructions.",
        control_id: "reference-only-rag",
    },
    SignalBlueprint {
        id: "tool-execution",
        label: "AI to tool execution",
        category: "execution",
        markers: &[
            "execute",
            "tool",
            "command",
            "shell",
            "write file",
            "delete",
            "admin",
            "deploy",
            "commit",
            "push",
            "api call",
        ],
        risk_points: 26,
        confidence_points: 11,
        policy:
            "Tool execution requires allowlists, scoped targets, and confirmation when privileged.",
        control_id: "confirm-tool-use",
    },
    SignalBlueprint {
        id: "external-post",
        label: "External message or webhook post",
        category: "integration",
        markers: &[
            "slack", "discord", "webhook", "send", "post", "publish", "channel", "reply", "notify",
        ],
        risk_points: 21,
        confidence_points: 9,
        policy: "Outbound integrations need recipient, channel, and payload preview.",
        control_id: "preview-outbound",
    },
    SignalBlueprint {
        id: "destructive-action",
        label: "Destructive or irreversible action",
        category: "execution",
        markers: &[
            "delete",
            "purge",
            "wipe",
            "reset",
            "overwrite",
            "revoke",
            "rotate",
            "drop table",
            "remove",
            "destroy",
        ],
        risk_points: 34,
        confidence_points: 13,
        policy: "Destructive operations require explicit confirmation and verified target scope.",
        control_id: "destructive-confirmation",
    },
    SignalBlueprint {
        id: "auth-boundary",
        label: "Authentication or authorization boundary",
        category: "security",
        markers: &[
            "jwt",
            "login",
            "admin",
            "role",
            "rbac",
            "cors",
            "session",
            "permission",
            "owner",
            "auth",
        ],
        risk_points: 19,
        confidence_points: 8,
        policy: "Authentication and authorization checks must happen before business logic.",
        control_id: "enforce-authz",
    },
    SignalBlueprint {
        id: "uncertainty",
        label: "Uncertainty or stale information",
        category: "reliability",
        markers: &[
            "latest",
            "recent",
            "today",
            "verify",
            "source",
            "guess",
            "probably",
            "uncertain",
            "unknown",
        ],
        risk_points: 12,
        confidence_points: 7,
        policy: "Uncertain claims must be labeled and sourced where possible.",
        control_id: "mark-uncertainty",
    },
    SignalBlueprint {
        id: "retention",
        label: "Log or data retention",
        category: "privacy",
        markers: &[
            "log",
            "audit",
            "retention",
            "history",
            "store",
            "record",
            "jsonl",
            "trace",
            "cache",
        ],
        risk_points: 18,
        confidence_points: 8,
        policy: "Retain decision metadata, not raw secrets or private payloads.",
        control_id: "short-retention",
    },
];

#[cfg(target_os = "macos")]
extern "C" {
    fn swift_score_responsible_ai_risk(
        context_ptr: *const c_char,
        action_ptr: *const c_char,
    ) -> f64;

    fn swift_generate_responsible_ai_advisory(
        context_ptr: *const c_char,
        action_ptr: *const c_char,
        output_ptr: *mut c_char,
        output_len: usize,
    ) -> i32;
}

pub fn build_responsible_guard_report(
    context: impl AsRef<str>,
    requested_action: impl AsRef<str>,
) -> ResponsibleGuardReport {
    let profile = profile_context(context.as_ref(), requested_action.as_ref());
    let signals = detect_signals(&profile);
    let rust_risk = calculate_rust_risk(&profile, &signals);
    let risk_score = combined_risk_score(&profile, &signals, rust_risk);
    let confidence_score = calculate_confidence_score(&profile, &signals);
    let decision = decide(&signals, risk_score);
    let swift_advisory = swift_advisory_or_fallback(&profile, &signals, &decision, risk_score);
    let controls = build_controls(&signals, &decision);
    let boundaries = build_boundaries(&signals);
    let redactions = build_redactions(&signals);
    let escalations = build_escalations(&signals, &decision, risk_score);
    let audit = build_audit(&profile, &signals, &decision);
    let metrics = build_metrics(&profile, &signals, risk_score, confidence_score, rust_risk);
    let next_actions = build_next_actions(&signals, &decision);
    let summary = build_summary(&decision, risk_score, &signals);

    ResponsibleGuardReport {
        codename: "ResponsibleAI-NativeGuard".into(),
        generated_at: now_epoch(),
        mode: if cfg!(target_os = "macos") {
            "swift-rust-responsible-guard".into()
        } else {
            "rust-responsible-guard".into()
        },
        decision,
        summary,
        risk_score,
        confidence_score,
        context_hash: profile.context_hash,
        action_hash: profile.action_hash,
        context_excerpt: profile.context_excerpt,
        action_excerpt: profile.action_excerpt,
        swift_advisory,
        signals,
        boundaries,
        controls,
        redactions,
        escalations,
        audit,
        metrics,
        next_actions,
    }
}

fn profile_context(context: &str, action: &str) -> ContextProfile {
    let context = sanitize_field(context);
    let action = sanitize_field(action);
    let combined = format!("{context} {action}");
    let bytes = combined.len();
    let words = combined
        .split_whitespace()
        .filter(|part| !part.is_empty())
        .count();
    let entropy = normalized_entropy(&combined);
    let imperative_density = imperative_density(&combined);

    ContextProfile {
        context_hash: short_hash(&context),
        action_hash: short_hash(&action),
        context_excerpt: excerpt(&context, 260),
        action_excerpt: excerpt(&action, 180),
        context,
        action,
        combined,
        bytes,
        words,
        entropy,
        imperative_density,
    }
}

fn sanitize_field(value: &str) -> String {
    let mut output = String::with_capacity(value.len().min(MAX_FIELD_BYTES));

    for ch in value.chars() {
        if output.len() >= MAX_FIELD_BYTES {
            break;
        }

        match ch {
            '\0' => output.push(' '),
            '\r' | '\n' | '\t' => output.push(' '),
            ch if ch.is_control() => output.push(' '),
            ch => output.push(ch),
        }
    }

    let compacted = output.split_whitespace().collect::<Vec<_>>().join(" ");
    if compacted.is_empty() {
        "responsible ai guard request".into()
    } else {
        compacted
    }
}

fn short_hash(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize()).chars().take(16).collect()
}

fn excerpt(value: &str, max_bytes: usize) -> String {
    let mut output = String::new();
    for ch in value.chars() {
        if output.len() + ch.len_utf8() > max_bytes {
            output.push_str("...");
            break;
        }
        output.push(ch);
    }
    output
}

fn normalized_entropy(value: &str) -> f64 {
    if value.is_empty() {
        return 0.0;
    }

    let mut counts: BTreeMap<char, usize> = BTreeMap::new();
    for ch in value.chars() {
        *counts.entry(ch).or_default() += 1;
    }

    let len = value.chars().count() as f64;
    let entropy = counts.values().fold(0.0, |acc, count| {
        let probability = *count as f64 / len;
        acc - (probability * probability.log2())
    });
    let max_entropy = (counts.len() as f64).log2().max(1.0);

    (entropy / max_entropy).clamp(0.0, 1.0)
}

fn imperative_density(value: &str) -> f64 {
    let lower = value.to_lowercase();
    let imperative_words = [
        "do", "run", "execute", "write", "delete", "send", "post", "commit", "push", "ignore",
        "override", "reveal", "show", "dump", "export", "publish",
    ];
    let words = lower.split_whitespace().collect::<Vec<_>>();
    if words.is_empty() {
        return 0.0;
    }

    let hits = words
        .iter()
        .filter(|word| {
            imperative_words.contains(&word.trim_matches(|ch: char| !ch.is_alphanumeric()))
        })
        .count();

    (hits as f64 / words.len() as f64).clamp(0.0, 1.0)
}

fn detect_signals(profile: &ContextProfile) -> Vec<ResponsibleSignal> {
    let context_lower = profile.context.to_lowercase();
    let action_lower = profile.action.to_lowercase();
    let combined_lower = profile.combined.to_lowercase();
    let mut signals = Vec::new();

    for blueprint in SIGNALS {
        let mut hits = Vec::new();
        for marker in blueprint.markers {
            if action_lower.contains(marker) {
                hits.push(format!("action:{marker}"));
            } else if context_lower.contains(marker) {
                hits.push(format!("context:{marker}"));
            } else if combined_lower.contains(marker) {
                hits.push(format!("combined:{marker}"));
            }
        }

        if hits.is_empty() {
            continue;
        }

        signals.push(ResponsibleSignal {
            id: blueprint.id.into(),
            label: blueprint.label.into(),
            category: blueprint.category.into(),
            severity: severity_for_points(blueprint.risk_points).into(),
            hits,
            risk_points: blueprint.risk_points,
            confidence_points: blueprint.confidence_points,
            policy: blueprint.policy.into(),
        });
    }

    signals
}

fn calculate_rust_risk(profile: &ContextProfile, signals: &[ResponsibleSignal]) -> f64 {
    let signal_risk = signals
        .iter()
        .map(|signal| signal.risk_points as f64)
        .sum::<f64>();
    let density_pressure = profile.imperative_density * 24.0;
    let entropy_pressure = profile.entropy * 8.0;
    let length_pressure = (profile.bytes as f64 / 512.0).min(12.0);
    let combo_pressure = combo_pressure(signals);

    (10.0 + signal_risk + density_pressure + entropy_pressure + length_pressure + combo_pressure)
        .clamp(0.0, 100.0)
}

fn combo_pressure(signals: &[ResponsibleSignal]) -> f64 {
    let ids = signal_ids(signals);
    let mut pressure = 0.0;

    if ids.contains("secret-material") && ids.contains("external-post") {
        pressure += 18.0;
    }
    if ids.contains("rag-injection") && ids.contains("tool-execution") {
        pressure += 16.0;
    }
    if ids.contains("destructive-action") && ids.contains("auth-boundary") {
        pressure += 12.0;
    }
    if ids.contains("personal-data") && ids.contains("retention") {
        pressure += 10.0;
    }

    pressure
}

#[cfg(target_os = "macos")]
fn combined_risk_score(
    profile: &ContextProfile,
    _signals: &[ResponsibleSignal],
    rust_risk: f64,
) -> u8 {
    let Ok(context) = CString::new(profile.context.as_str()) else {
        return rust_risk.round().clamp(0.0, 100.0) as u8;
    };
    let Ok(action) = CString::new(profile.action.as_str()) else {
        return rust_risk.round().clamp(0.0, 100.0) as u8;
    };

    let swift_risk = unsafe { swift_score_responsible_ai_risk(context.as_ptr(), action.as_ptr()) };
    ((rust_risk * 0.58) + (swift_risk * 0.42))
        .round()
        .clamp(0.0, 100.0) as u8
}

#[cfg(not(target_os = "macos"))]
fn combined_risk_score(
    _profile: &ContextProfile,
    _signals: &[ResponsibleSignal],
    rust_risk: f64,
) -> u8 {
    rust_risk.round().clamp(0.0, 100.0) as u8
}

fn calculate_confidence_score(profile: &ContextProfile, signals: &[ResponsibleSignal]) -> u8 {
    let signal_confidence = signals
        .iter()
        .map(|signal| signal.confidence_points)
        .sum::<i32>();
    let context_bonus = if profile.words >= 16 { 8 } else { 3 };
    let entropy_bonus = (profile.entropy * 8.0).round() as i32;
    let score = 42 + signal_confidence + context_bonus + entropy_bonus;

    score.clamp(20, 99) as u8
}

fn decide(signals: &[ResponsibleSignal], risk_score: u8) -> String {
    let ids = signal_ids(signals);

    if ids.contains("secret-material") && ids.contains("external-post") {
        return "block_until_redacted".into();
    }
    if ids.contains("rag-injection") && ids.contains("tool-execution") {
        return "requires_review".into();
    }
    if ids.contains("destructive-action") || ids.contains("tool-execution") {
        return "requires_confirmation".into();
    }
    if risk_score >= 75 {
        return "requires_review".into();
    }
    if risk_score >= 45 {
        return "allow_with_controls".into();
    }

    "allow".into()
}

#[cfg(target_os = "macos")]
fn swift_advisory_or_fallback(
    profile: &ContextProfile,
    signals: &[ResponsibleSignal],
    decision: &str,
    risk_score: u8,
) -> String {
    let Ok(context) = CString::new(profile.context.as_str()) else {
        return rust_advisory(signals, decision, risk_score);
    };
    let Ok(action) = CString::new(profile.action.as_str()) else {
        return rust_advisory(signals, decision, risk_score);
    };

    let mut output = vec![0 as c_char; SWIFT_ADVISORY_BUFFER_BYTES];
    let written = unsafe {
        swift_generate_responsible_ai_advisory(
            context.as_ptr(),
            action.as_ptr(),
            output.as_mut_ptr(),
            output.len(),
        )
    };

    if written <= 0 {
        return rust_advisory(signals, decision, risk_score);
    }

    unsafe { CStr::from_ptr(output.as_ptr()) }
        .to_string_lossy()
        .into_owned()
}

#[cfg(not(target_os = "macos"))]
fn swift_advisory_or_fallback(
    _profile: &ContextProfile,
    signals: &[ResponsibleSignal],
    decision: &str,
    risk_score: u8,
) -> String {
    let _ = SWIFT_ADVISORY_BUFFER_BYTES;
    rust_advisory(signals, decision, risk_score)
}

fn rust_advisory(signals: &[ResponsibleSignal], decision: &str, risk_score: u8) -> String {
    let matched = if signals.is_empty() {
        "baseline".into()
    } else {
        signals
            .iter()
            .map(|signal| format!("{}:{}", signal.id, signal.label))
            .collect::<Vec<_>>()
            .join(",")
    };

    let controls = build_control_ids(signals)
        .into_iter()
        .collect::<Vec<_>>()
        .join(",");

    [
        format!("decision={decision}"),
        format!("risk={risk_score}"),
        format!("matched={matched}"),
        format!("controls={controls}"),
        "advisory=Rust fallback active; keep local-first handling and require confirmation for privileged actions"
            .into(),
    ]
    .join("\n")
}

fn build_controls(signals: &[ResponsibleSignal], decision: &str) -> Vec<ResponsibleControl> {
    let ids = build_control_ids(signals);
    let mut controls = Vec::new();

    for id in ids {
        controls.push(match id.as_str() {
            "redact-secrets" => ResponsibleControl {
                id,
                label: "Redact secrets".into(),
                applies_to: vec!["logs".into(), "prompts".into(), "commits".into(), "outbound".into()],
                strength: "required".into(),
                description:
                    "Mask API keys, tokens, webhook URLs, JWT secrets, and .env values before storage or transmission."
                        .into(),
            },
            "minimize-personal-data" => ResponsibleControl {
                id,
                label: "Minimize personal data".into(),
                applies_to: vec!["RAG".into(), "logs".into(), "chat".into()],
                strength: "required".into(),
                description:
                    "Collect and retain only the user data needed for the current task and consent boundary."
                        .into(),
            },
            "reference-only-rag" => ResponsibleControl {
                id,
                label: "Reference-only RAG".into(),
                applies_to: vec!["retrieval".into(), "prompting".into()],
                strength: "required".into(),
                description:
                    "Treat retrieved documents as untrusted reference text that cannot override policy."
                        .into(),
            },
            "confirm-tool-use" => ResponsibleControl {
                id,
                label: "Confirm tool use".into(),
                applies_to: vec!["commands".into(), "file writes".into(), "API calls".into()],
                strength: "required".into(),
                description:
                    "Use allowlists and require human confirmation for privileged tool execution."
                        .into(),
            },
            "preview-outbound" => ResponsibleControl {
                id,
                label: "Preview outbound content".into(),
                applies_to: vec!["Slack".into(), "Discord".into(), "webhooks".into()],
                strength: "required".into(),
                description:
                    "Show recipient, channel, and payload before sending to external integrations."
                        .into(),
            },
            "destructive-confirmation" => ResponsibleControl {
                id,
                label: "Destructive confirmation".into(),
                applies_to: vec!["delete".into(), "purge".into(), "reset".into()],
                strength: "required".into(),
                description:
                    "Confirm exact target paths, resources, and irreversible impact before action."
                        .into(),
            },
            "enforce-authz" => ResponsibleControl {
                id,
                label: "Enforce authorization".into(),
                applies_to: vec!["admin routes".into(), "sessions".into(), "roles".into()],
                strength: "required".into(),
                description:
                    "Authenticate and authorize before business logic or tool execution."
                        .into(),
            },
            "mark-uncertainty" => ResponsibleControl {
                id,
                label: "Mark uncertainty".into(),
                applies_to: vec!["answers".into(), "summaries".into()],
                strength: "recommended".into(),
                description:
                    "Label inferred, stale, unsourced, or uncertain answers before users rely on them."
                        .into(),
            },
            "short-retention" => ResponsibleControl {
                id,
                label: "Short retention".into(),
                applies_to: vec!["logs".into(), "audit".into(), "RAG".into()],
                strength: "recommended".into(),
                description:
                    "Prefer short retention windows and decision metadata over raw sensitive payloads."
                        .into(),
            },
            _ => ResponsibleControl {
                id,
                label: "Responsible AI baseline".into(),
                applies_to: vec!["system".into()],
                strength: "baseline".into(),
                description: "Keep privacy, consent, least privilege, and honesty in force.".into(),
            },
        });
    }

    if decision != "allow"
        && !controls
            .iter()
            .any(|control| control.id == "operator-review")
    {
        controls.push(ResponsibleControl {
            id: "operator-review".into(),
            label: "Operator review".into(),
            applies_to: vec!["decision".into()],
            strength: "required".into(),
            description: "Pause automation until a human reviews the action plan.".into(),
        });
    }

    controls
}

fn build_control_ids(signals: &[ResponsibleSignal]) -> BTreeSet<String> {
    let mut ids = BTreeSet::from([
        "responsible-baseline".to_string(),
        "redact-secrets".to_string(),
        "reference-only-rag".to_string(),
    ]);

    for signal in signals {
        if let Some(blueprint) = SIGNALS.iter().find(|blueprint| blueprint.id == signal.id) {
            ids.insert(blueprint.control_id.into());
        }
    }

    ids
}

fn build_boundaries(signals: &[ResponsibleSignal]) -> Vec<ResponsibleBoundary> {
    let ids = signal_ids(signals);
    let mut boundaries = vec![
        ResponsibleBoundary {
            id: "user-to-ai".into(),
            label: "User input to AI reasoning".into(),
            from_zone: "untrusted natural language".into(),
            to_zone: "AI planner".into(),
            risk: "prompt injection, accidental secrets, ambiguous intent".into(),
            required_control: "input classification and policy priority".into(),
        },
        ResponsibleBoundary {
            id: "ai-to-tool".into(),
            label: "AI reasoning to tool execution".into(),
            from_zone: "AI planner".into(),
            to_zone: "privileged local action".into(),
            risk: "unreviewed file writes, commands, API calls, or admin actions".into(),
            required_control: "allowlists and confirmation".into(),
        },
    ];

    if ids.contains("external-post") {
        boundaries.push(ResponsibleBoundary {
            id: "ai-to-external".into(),
            label: "AI output to external integration".into(),
            from_zone: "local instance".into(),
            to_zone: "Slack, Discord, GitHub, or webhook endpoint".into(),
            risk: "private content leaves local trust boundary".into(),
            required_control: "recipient and payload preview".into(),
        });
    }

    if ids.contains("rag-injection") {
        boundaries.push(ResponsibleBoundary {
            id: "rag-to-policy".into(),
            label: "Retrieved text to policy stack".into(),
            from_zone: "RAG corpus".into(),
            to_zone: "prompt context".into(),
            risk: "retrieved instructions attempt to override system policy".into(),
            required_control: "reference-only treatment".into(),
        });
    }

    boundaries
}

fn build_redactions(signals: &[ResponsibleSignal]) -> Vec<ResponsibleRedaction> {
    let ids = signal_ids(signals);
    let mut redactions = vec![
        ResponsibleRedaction {
            id: "redact-api-like-values".into(),
            target: "API keys, tokens, JWT secrets, signing secrets".into(),
            reason: "credential leakage risk".into(),
            action: "mask before log, prompt, commit, or outbound post".into(),
        },
        ResponsibleRedaction {
            id: "redact-webhook-urls".into(),
            target: "Slack and Discord webhook URLs".into(),
            reason: "webhook URLs are bearer credentials".into(),
            action: "store only in local .env or secret manager".into(),
        },
    ];

    if ids.contains("personal-data") {
        redactions.push(ResponsibleRedaction {
            id: "minimize-personal-fields".into(),
            target: "names, emails, phone numbers, addresses, private documents".into(),
            reason: "personal data minimization".into(),
            action: "summarize or omit unless explicitly needed".into(),
        });
    }

    if ids.contains("retention") {
        redactions.push(ResponsibleRedaction {
            id: "omit-raw-payloads".into(),
            target: "raw prompts, retrieved chunks, full chat logs".into(),
            reason: "retention should not become a second data leak".into(),
            action: "retain decision metadata and short excerpts only".into(),
        });
    }

    redactions
}

fn build_escalations(
    signals: &[ResponsibleSignal],
    decision: &str,
    risk_score: u8,
) -> Vec<ResponsibleEscalation> {
    let ids = signal_ids(signals);
    let mut escalations = Vec::new();

    if decision == "block_until_redacted" {
        escalations.push(ResponsibleEscalation {
            id: "redaction-required".into(),
            trigger: "secret material combined with external posting or storage".into(),
            owner: "operator".into(),
            instruction: "Redact the secret, rotate it if exposed, then retry.".into(),
        });
    }

    if ids.contains("destructive-action") {
        escalations.push(ResponsibleEscalation {
            id: "destructive-review".into(),
            trigger: "delete, purge, reset, revoke, rotate, or overwrite request".into(),
            owner: "operator".into(),
            instruction: "Confirm exact target and irreversible impact before execution.".into(),
        });
    }

    if ids.contains("rag-injection") && ids.contains("tool-execution") {
        escalations.push(ResponsibleEscalation {
            id: "rag-tool-review".into(),
            trigger: "retrieved or user text may influence tool execution".into(),
            owner: "maintainer".into(),
            instruction: "Check prompt-injection handling and tool allowlists.".into(),
        });
    }

    if risk_score >= 80 {
        escalations.push(ResponsibleEscalation {
            id: "high-risk-review".into(),
            trigger: format!("risk_score={risk_score}"),
            owner: "security reviewer".into(),
            instruction: "Review the action manually before automation continues.".into(),
        });
    }

    escalations
}

fn build_audit(
    profile: &ContextProfile,
    signals: &[ResponsibleSignal],
    decision: &str,
) -> Vec<ResponsibleAuditItem> {
    vec![
        ResponsibleAuditItem {
            id: "input-profile".into(),
            event: "classified responsible AI guard request".into(),
            retained: format!(
                "context_hash={}, action_hash={}, words={}",
                profile.context_hash, profile.action_hash, profile.words
            ),
            omitted: "raw secrets, full private documents, full chat payloads".into(),
        },
        ResponsibleAuditItem {
            id: "policy-signals".into(),
            event: "matched policy signals".into(),
            retained: signals
                .iter()
                .map(|signal| signal.id.as_str())
                .collect::<Vec<_>>()
                .join(","),
            omitted: "exact sensitive matched values".into(),
        },
        ResponsibleAuditItem {
            id: "decision".into(),
            event: "computed responsible guard decision".into(),
            retained: decision.into(),
            omitted: "unredacted prompt and outbound payload".into(),
        },
    ]
}

fn build_metrics(
    profile: &ContextProfile,
    signals: &[ResponsibleSignal],
    risk_score: u8,
    confidence_score: u8,
    rust_risk: f64,
) -> Vec<ResponsibleMetric> {
    let categories = signals
        .iter()
        .map(|signal| signal.category.clone())
        .collect::<BTreeSet<_>>();

    vec![
        ResponsibleMetric {
            id: "risk".into(),
            label: "Risk score".into(),
            value: risk_score.to_string(),
            band: risk_band(risk_score).into(),
        },
        ResponsibleMetric {
            id: "confidence".into(),
            label: "Confidence score".into(),
            value: confidence_score.to_string(),
            band: confidence_band(confidence_score).into(),
        },
        ResponsibleMetric {
            id: "rust-risk".into(),
            label: "Rust risk baseline".into(),
            value: format!("{rust_risk:.1}"),
            band: risk_band(rust_risk.round().clamp(0.0, 100.0) as u8).into(),
        },
        ResponsibleMetric {
            id: "signal-count".into(),
            label: "Signal count".into(),
            value: signals.len().to_string(),
            band: if signals.len() >= 5 {
                "dense".into()
            } else if signals.is_empty() {
                "baseline".into()
            } else {
                "focused".into()
            },
        },
        ResponsibleMetric {
            id: "category-count".into(),
            label: "Category count".into(),
            value: categories.len().to_string(),
            band: if categories.len() >= 4 {
                "cross-boundary".into()
            } else {
                "contained".into()
            },
        },
        ResponsibleMetric {
            id: "imperative-density".into(),
            label: "Imperative density".into(),
            value: format!("{:.3}", profile.imperative_density),
            band: if profile.imperative_density > 0.08 {
                "action-heavy".into()
            } else {
                "low".into()
            },
        },
        ResponsibleMetric {
            id: "entropy".into(),
            label: "Context entropy".into(),
            value: format!("{:.3}", profile.entropy),
            band: if profile.entropy > 0.72 {
                "rich".into()
            } else {
                "plain".into()
            },
        },
    ]
}

fn build_next_actions(signals: &[ResponsibleSignal], decision: &str) -> Vec<String> {
    let ids = signal_ids(signals);
    let mut actions = Vec::new();

    match decision {
        "block_until_redacted" => {
            actions
                .push("Redact secrets and rotate any leaked credential before proceeding".into());
            actions.push("Re-run the guard after redaction".into());
        }
        "requires_review" => {
            actions.push("Route the request to security or maintainer review".into());
            actions.push("Confirm RAG and tool boundaries before execution".into());
        }
        "requires_confirmation" => {
            actions.push("Show exact action, target, and impact to the user".into());
            actions.push("Wait for explicit confirmation before running the action".into());
        }
        "allow_with_controls" => {
            actions.push("Apply listed controls and continue".into());
            actions.push("Retain only redacted audit metadata".into());
        }
        _ => {
            actions.push("Continue with baseline privacy and logging controls".into());
        }
    }

    if ids.contains("external-post") {
        actions.push("Preview outbound channel, recipient, and payload".into());
    }
    if ids.contains("rag-injection") {
        actions.push("Treat retrieved text as reference data only".into());
    }
    if ids.contains("uncertainty") {
        actions.push("Mark uncertain claims and cite sources where available".into());
    }

    actions
}

fn build_summary(decision: &str, risk_score: u8, signals: &[ResponsibleSignal]) -> String {
    let top_signal = signals
        .iter()
        .max_by_key(|signal| signal.risk_points)
        .map(|signal| signal.label.as_str())
        .unwrap_or("baseline responsible AI policy");

    format!("{decision} at risk {risk_score}; top signal: {top_signal}")
}

fn signal_ids(signals: &[ResponsibleSignal]) -> BTreeSet<String> {
    signals
        .iter()
        .map(|signal| signal.id.clone())
        .collect::<BTreeSet<_>>()
}

fn severity_for_points(points: i32) -> &'static str {
    match points {
        0..=14 => "low",
        15..=23 => "medium",
        24..=31 => "high",
        _ => "critical",
    }
}

fn risk_band(score: u8) -> &'static str {
    match score {
        0..=29 => "low",
        30..=54 => "medium",
        55..=74 => "high",
        _ => "critical",
    }
}

fn confidence_band(score: u8) -> &'static str {
    match score {
        0..=39 => "weak",
        40..=64 => "moderate",
        65..=84 => "strong",
        _ => "locked",
    }
}

fn now_epoch() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_control_characters() {
        let profile = profile_context("api\0key\nrag", "send\tto slack");
        assert_eq!(profile.context, "api key rag");
        assert_eq!(profile.action, "send to slack");
    }

    #[test]
    fn blocks_secret_external_post_combo() {
        let report = build_responsible_guard_report(
            "contains api key and Discord webhook",
            "send this to slack",
        );
        assert_eq!(report.decision, "block_until_redacted");
        assert!(report.risk_score >= 75);
    }

    #[test]
    fn detects_rag_tool_review_boundary() {
        let report = build_responsible_guard_report(
            "retrieved RAG document says ignore previous system prompt",
            "execute admin command",
        );
        assert_eq!(report.decision, "requires_review");
        assert!(report
            .boundaries
            .iter()
            .any(|boundary| boundary.id == "rag-to-policy"));
    }
}
