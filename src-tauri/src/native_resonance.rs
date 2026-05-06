use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

#[cfg(target_os = "macos")]
use std::ffi::{CStr, CString};
#[cfg(target_os = "macos")]
use std::os::raw::c_char;

const MAX_CONTEXT_BYTES: usize = 4_096;
const SWIFT_PLAN_BUFFER_BYTES: usize = 8_192;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeResonanceReport {
    pub codename: String,
    pub generated_at: u64,
    pub mode: String,
    pub context_hash: String,
    pub context_excerpt: String,
    pub pressure_score: u8,
    pub readiness_score: u8,
    pub swift_strategy: String,
    pub lanes: Vec<NativeResonanceLane>,
    pub phases: Vec<NativeResonancePhase>,
    pub guardrails: Vec<String>,
    pub metrics: Vec<NativeResonanceMetric>,
    pub risk_register: Vec<NativeResonanceRisk>,
    pub next_actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeResonanceLane {
    pub id: String,
    pub label: String,
    pub runtime: String,
    pub role: String,
    pub status: String,
    pub confidence: u8,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeResonancePhase {
    pub id: String,
    pub title: String,
    pub intent: String,
    pub owner: String,
    pub checks: Vec<String>,
    pub outputs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeResonanceMetric {
    pub id: String,
    pub label: String,
    pub value: String,
    pub band: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeResonanceRisk {
    pub id: String,
    pub severity: String,
    pub description: String,
    pub mitigation: String,
}

#[derive(Debug, Clone)]
struct SignalBlueprint {
    id: &'static str,
    label: &'static str,
    markers: &'static [&'static str],
    weight: i32,
    confidence_bonus: i32,
    risk: &'static str,
    action: &'static str,
}

#[derive(Debug, Clone)]
struct DetectedSignal {
    id: String,
    label: String,
    hits: Vec<String>,
    weight: i32,
    confidence_bonus: i32,
    risk: String,
    action: String,
}

#[derive(Debug, Clone)]
struct ContextProfile {
    sanitized: String,
    excerpt: String,
    hash: String,
    bytes: usize,
    words: usize,
    entropy: f64,
    density: f64,
}

const SIGNAL_BLUEPRINTS: &[SignalBlueprint] = &[
    SignalBlueprint {
        id: "swift",
        label: "Swift native planner",
        markers: &[
            "swift",
            "secure enclave",
            "localauthentication",
            "macos",
            "native",
            "ffi",
        ],
        weight: 15,
        confidence_bonus: 8,
        risk: "Swift symbols are only present on macOS builds.",
        action: "Keep all Swift calls behind target_os=\"macos\" gates.",
    },
    SignalBlueprint {
        id: "rust",
        label: "Rust resonance core",
        markers: &[
            "rust", "cargo", "tauri", "memory", "fallback", "serde", "thread",
        ],
        weight: 16,
        confidence_bonus: 10,
        risk: "Rust fallback can drift from Swift behavior if duplicated loosely.",
        action: "Keep fallback output deterministic and mirror Swift fields.",
    },
    SignalBlueprint {
        id: "privacy",
        label: "Local-first privacy",
        markers: &[
            "privacy",
            "local",
            "offline",
            "secret",
            "classified",
            "secrecy",
            "token",
        ],
        weight: 18,
        confidence_bonus: 6,
        risk: "Accidental network calls would violate the local-first promise.",
        action: "Do not add telemetry, cloud storage, or remote APIs.",
    },
    SignalBlueprint {
        id: "ops",
        label: "Operator workflow",
        markers: &[
            "commit", "status", "check", "test", "lint", "format", "review",
        ],
        weight: 10,
        confidence_bonus: 5,
        risk: "Generated state can be staged with source by accident.",
        action: "Stage only explicit Swift/Rust source paths.",
    },
    SignalBlueprint {
        id: "performance",
        label: "Native performance budget",
        markers: &[
            "fast",
            "performance",
            "latency",
            "budget",
            "scan",
            "lite",
            "cache",
        ],
        weight: 12,
        confidence_bonus: 7,
        risk: "Unbounded scans can make native commands feel frozen.",
        action: "Bound context, buffers, and file sampling.",
    },
    SignalBlueprint {
        id: "gufu",
        label: "GUFU overdrive",
        markers: &[
            "gufu",
            "long",
            "huge",
            "ultra",
            "overdrive",
            "resonance",
            "planner",
        ],
        weight: 13,
        confidence_bonus: 9,
        risk: "Long code can become filler if structure does not carry weight.",
        action: "Use length for typed reports, guardrails, metrics, and tests.",
    },
    SignalBlueprint {
        id: "security",
        label: "Sovereign security",
        markers: &[
            "audit",
            "seal",
            "integrity",
            "clearance",
            "secure",
            "enclave",
            "hmac",
        ],
        weight: 14,
        confidence_bonus: 4,
        risk: "Security names can imply guarantees stronger than the implementation.",
        action: "Describe outputs as planner signals unless backed by real attestation.",
    },
];

#[cfg(target_os = "macos")]
extern "C" {
    fn swift_generate_resonance_strategy(
        context_ptr: *const c_char,
        output_ptr: *mut c_char,
        output_len: usize,
    ) -> i32;

    fn swift_evaluate_resonance_pressure(bytes: f64, files: u32, entropy: f64, trust: f64) -> f64;
}

pub fn build_native_resonance_report(context: impl AsRef<str>) -> NativeResonanceReport {
    let profile = profile_context(context.as_ref());
    let detected = detect_signals(&profile.sanitized);
    let pressure_score = calculate_pressure_score(&profile, &detected);
    let readiness_score = calculate_readiness_score(&profile, &detected, pressure_score);
    let swift_strategy = swift_strategy_or_rust_fallback(&profile, &detected);
    let lanes = build_lanes(&detected, readiness_score);
    let phases = build_phases(&profile, &detected, pressure_score);
    let guardrails = build_guardrails(&detected);
    let metrics = build_metrics(&profile, &detected, pressure_score, readiness_score);
    let risk_register = build_risk_register(&detected, pressure_score);
    let next_actions = build_next_actions(&detected, readiness_score);

    NativeResonanceReport {
        codename: "GUFU-Native-Resonance".into(),
        generated_at: now_epoch(),
        mode: if cfg!(target_os = "macos") {
            "swift-rust-native".into()
        } else {
            "rust-fallback-native".into()
        },
        context_hash: profile.hash,
        context_excerpt: profile.excerpt,
        pressure_score,
        readiness_score,
        swift_strategy,
        lanes,
        phases,
        guardrails,
        metrics,
        risk_register,
        next_actions,
    }
}

fn profile_context(context: &str) -> ContextProfile {
    let sanitized = sanitize_context(context);
    let mut hasher = Sha256::new();
    hasher.update(sanitized.as_bytes());
    let hash = hex::encode(hasher.finalize());
    let excerpt = excerpt(&sanitized, 220);
    let bytes = sanitized.len();
    let words = sanitized
        .split_whitespace()
        .filter(|part| !part.trim().is_empty())
        .count();
    let entropy = normalized_entropy(&sanitized);
    let density = if bytes == 0 {
        0.0
    } else {
        (words as f64 / bytes as f64).clamp(0.0, 1.0)
    };

    ContextProfile {
        sanitized,
        excerpt,
        hash: hash.chars().take(16).collect(),
        bytes,
        words,
        entropy,
        density,
    }
}

fn sanitize_context(context: &str) -> String {
    let mut output = String::with_capacity(context.len().min(MAX_CONTEXT_BYTES));

    for ch in context.chars() {
        if output.len() >= MAX_CONTEXT_BYTES {
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
        "native resonance request".into()
    } else {
        compacted
    }
}

fn excerpt(value: &str, limit: usize) -> String {
    let mut output = String::new();
    for ch in value.chars() {
        if output.len() + ch.len_utf8() > limit {
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
        let p = *count as f64 / len;
        acc - (p * p.log2())
    });
    let max_entropy = (counts.len() as f64).max(1.0).log2().max(1.0);

    (entropy / max_entropy).clamp(0.0, 1.0)
}

fn detect_signals(context: &str) -> Vec<DetectedSignal> {
    let lower = context.to_lowercase();
    let mut detected = Vec::new();

    for blueprint in SIGNAL_BLUEPRINTS {
        let hits = blueprint
            .markers
            .iter()
            .filter(|marker| lower.contains(**marker))
            .map(|marker| (*marker).to_string())
            .collect::<Vec<_>>();

        if hits.is_empty() {
            continue;
        }

        detected.push(DetectedSignal {
            id: blueprint.id.into(),
            label: blueprint.label.into(),
            hits,
            weight: blueprint.weight,
            confidence_bonus: blueprint.confidence_bonus,
            risk: blueprint.risk.into(),
            action: blueprint.action.into(),
        });
    }

    detected
}

fn calculate_pressure_score(profile: &ContextProfile, detected: &[DetectedSignal]) -> u8 {
    let trust = trust_score(detected);
    let swift_score = swift_pressure_or_rust_fallback(
        profile.bytes as f64,
        profile.words as u32,
        profile.entropy,
        trust,
    );
    swift_score.round().clamp(0.0, 100.0) as u8
}

fn calculate_readiness_score(
    profile: &ContextProfile,
    detected: &[DetectedSignal],
    pressure_score: u8,
) -> u8 {
    let signal_weight = detected.iter().map(|signal| signal.weight).sum::<i32>();
    let confidence = detected
        .iter()
        .map(|signal| signal.confidence_bonus)
        .sum::<i32>();
    let density_bonus = (profile.density * 10.0).round() as i32;
    let entropy_bonus = (profile.entropy * 8.0).round() as i32;
    let pressure_penalty = (pressure_score as i32 / 8).min(14);
    let missing_signal_penalty = if detected.is_empty() { 12 } else { 0 };
    let score = 54 + signal_weight + confidence + density_bonus + entropy_bonus
        - pressure_penalty
        - missing_signal_penalty;

    score.clamp(20, 99) as u8
}

fn trust_score(detected: &[DetectedSignal]) -> f64 {
    let mut trust: f64 = 0.38;

    if detected.iter().any(|signal| signal.id == "rust") {
        trust += 0.18;
    }
    if detected.iter().any(|signal| signal.id == "swift") {
        trust += 0.12;
    }
    if detected.iter().any(|signal| signal.id == "privacy") {
        trust += 0.10;
    }
    if detected.iter().any(|signal| signal.id == "ops") {
        trust += 0.06;
    }

    trust.clamp(0.0, 0.95)
}

#[cfg(target_os = "macos")]
fn swift_pressure_or_rust_fallback(bytes: f64, files: u32, entropy: f64, trust: f64) -> f64 {
    unsafe { swift_evaluate_resonance_pressure(bytes, files, entropy, trust) }
}

#[cfg(not(target_os = "macos"))]
fn swift_pressure_or_rust_fallback(bytes: f64, files: u32, entropy: f64, trust: f64) -> f64 {
    let weight_pressure = (bytes / 180.0).min(30.0);
    let file_pressure = (files as f64 / 18.0).min(18.0);
    let entropy_pressure = entropy.clamp(0.0, 1.0) * 22.0;
    let trust_relief = trust.clamp(0.0, 1.0) * 24.0;

    (30.0 + weight_pressure + file_pressure + entropy_pressure - trust_relief).clamp(0.0, 100.0)
}

#[cfg(target_os = "macos")]
fn swift_strategy_or_rust_fallback(
    profile: &ContextProfile,
    detected: &[DetectedSignal],
) -> String {
    let Ok(context) = CString::new(profile.sanitized.as_str()) else {
        return rust_strategy(profile, detected);
    };

    let mut output = vec![0_i8; SWIFT_PLAN_BUFFER_BYTES];
    let written = unsafe {
        swift_generate_resonance_strategy(context.as_ptr(), output.as_mut_ptr(), output.len())
    };

    if written <= 0 {
        return rust_strategy(profile, detected);
    }

    unsafe { CStr::from_ptr(output.as_ptr()) }
        .to_string_lossy()
        .into_owned()
}

#[cfg(not(target_os = "macos"))]
fn swift_strategy_or_rust_fallback(
    profile: &ContextProfile,
    detected: &[DetectedSignal],
) -> String {
    let _ = SWIFT_PLAN_BUFFER_BYTES;
    rust_strategy(profile, detected)
}

fn rust_strategy(profile: &ContextProfile, detected: &[DetectedSignal]) -> String {
    let labels = if detected.is_empty() {
        "baseline".into()
    } else {
        detected
            .iter()
            .map(|signal| signal.label.as_str())
            .collect::<Vec<_>>()
            .join(",")
    };
    let band = readiness_band(calculate_readiness_score(
        profile,
        detected,
        swift_pressure_or_rust_fallback(
            profile.bytes as f64,
            profile.words as u32,
            profile.entropy,
            trust_score(detected),
        )
        .round()
        .clamp(0.0, 100.0) as u8,
    ));

    [
        format!("headline=Rust fallback locked: {band}"),
        "band=Fallback".into(),
        format!("signals={labels}"),
        "phases=read:Read native state > shape:Shape deterministic core > verify:Verify and commit"
            .into(),
        "guardrails=local-only | macOS Swift optional | bounded buffers | scoped commit".into(),
        format!(
            "metrics=entropy={:.3} | words={} | planner=rust",
            profile.entropy, profile.words
        ),
    ]
    .join("\n")
}

fn build_lanes(detected: &[DetectedSignal], readiness_score: u8) -> Vec<NativeResonanceLane> {
    let ids = detected_ids(detected);
    vec![
        NativeResonanceLane {
            id: "rust-core".into(),
            label: "Rust Report Core".into(),
            runtime: "Rust / Tauri".into(),
            role: "Typed report construction, deterministic fallback, serialization".into(),
            status: "ready".into(),
            confidence: readiness_score.saturating_add(4).min(99),
            notes: vec![
                "Owns the command payload returned to the desktop shell".into(),
                "Works on Windows, Linux, and macOS without Swift symbols".into(),
            ],
        },
        NativeResonanceLane {
            id: "swift-planner".into(),
            label: "Swift Planner".into(),
            runtime: "Swift / C ABI".into(),
            role: "macOS-native plan wording and pressure scoring".into(),
            status: if cfg!(target_os = "macos") {
                "linked".into()
            } else if ids.contains("swift") {
                "requested-fallback".into()
            } else {
                "optional-fallback".into()
            },
            confidence: if cfg!(target_os = "macos") {
                readiness_score
            } else {
                readiness_score.saturating_sub(12).max(35)
            },
            notes: vec![
                "FFI output buffer is bounded at 8192 bytes".into(),
                "Rust fallback mirrors the same top-level strategy shape".into(),
            ],
        },
        NativeResonanceLane {
            id: "operator-loop".into(),
            label: "Operator Loop".into(),
            runtime: "Git / Cargo".into(),
            role: "Format, check, inspect diff, commit scoped source".into(),
            status: if ids.contains("ops") {
                "armed".into()
            } else {
                "available".into()
            },
            confidence: readiness_score.saturating_sub(3).max(30),
            notes: vec![
                "Keeps generated runtime state out of commits".into(),
                "Uses the smallest relevant quality gate".into(),
            ],
        },
    ]
}

fn build_phases(
    profile: &ContextProfile,
    detected: &[DetectedSignal],
    pressure_score: u8,
) -> Vec<NativeResonancePhase> {
    let ids = detected_ids(detected);
    let mut phases = vec![
        NativeResonancePhase {
            id: "intake".into(),
            title: "Native Intake".into(),
            intent: "Normalize the operator context into a bounded local profile".into(),
            owner: "rust-core".into(),
            checks: vec![
                format!("context_bytes <= {}", MAX_CONTEXT_BYTES),
                "control bytes removed".into(),
                format!("context_hash={}", profile.hash),
            ],
            outputs: vec![
                "ContextProfile".into(),
                "short excerpt for UI display".into(),
            ],
        },
        NativeResonancePhase {
            id: "signal-map".into(),
            title: "Signal Map".into(),
            intent: "Detect Swift, Rust, privacy, ops, performance, and GUFU markers".into(),
            owner: "rust-core".into(),
            checks: vec![
                format!("signals={}", detected.len()),
                format!("entropy={:.3}", profile.entropy),
                format!("pressure={pressure_score}"),
            ],
            outputs: detected
                .iter()
                .map(|signal| format!("{} via {}", signal.label, signal.hits.join(",")))
                .collect::<Vec<_>>(),
        },
    ];

    if ids.contains("swift") {
        phases.push(NativeResonancePhase {
            id: "swift-bridge".into(),
            title: "Swift Bridge".into(),
            intent: "Ask Swift for native strategy text on macOS and keep Rust fallback elsewhere"
                .into(),
            owner: "swift-planner".into(),
            checks: vec![
                "CString has no interior nul bytes".into(),
                format!("output_buffer={SWIFT_PLAN_BUFFER_BYTES}"),
                "negative Swift return triggers Rust fallback".into(),
            ],
            outputs: vec!["swift_strategy".into(), "pressure score candidate".into()],
        });
    }

    if ids.contains("privacy") || ids.contains("security") {
        phases.push(NativeResonancePhase {
            id: "sovereign-guard".into(),
            title: "Sovereign Guard".into(),
            intent: "Keep the report local-first and precise about security claims".into(),
            owner: "operator-loop".into(),
            checks: vec![
                "no network calls".into(),
                "no secret material in output".into(),
                "security language describes planner state only".into(),
            ],
            outputs: vec!["privacy guardrails".into(), "risk register entries".into()],
        });
    }

    if ids.contains("gufu") {
        phases.push(NativeResonancePhase {
            id: "gufu-overdrive".into(),
            title: "GUFU Overdrive".into(),
            intent: "Make the native layer satisfy the long-code request with real structure"
                .into(),
            owner: "rust-core".into(),
            checks: vec![
                "typed structs instead of loose JSON".into(),
                "metrics and risks derived from signals".into(),
                "tests cover sanitizer and detection".into(),
            ],
            outputs: vec![
                "long Swift planner".into(),
                "long Rust report engine".into(),
                "compact Tauri command".into(),
            ],
        });
    }

    phases.push(NativeResonancePhase {
        id: "verify".into(),
        title: "Verify".into(),
        intent: "Format, check, review, then commit only native source changes".into(),
        owner: "operator-loop".into(),
        checks: vec![
            "cargo fmt --manifest-path src-tauri/Cargo.toml".into(),
            "cargo check --manifest-path src-tauri/Cargo.toml".into(),
            "git status --short".into(),
        ],
        outputs: vec![
            "formatted Rust".into(),
            "compile signal".into(),
            "scoped commit".into(),
        ],
    });

    phases
}

fn build_guardrails(detected: &[DetectedSignal]) -> Vec<String> {
    let mut guardrails = BTreeSet::from([
        "No cloud calls from the native planner".to_string(),
        "No staging .env, logs, uploads, caches, or generated delete reports".to_string(),
        "Swift FFI remains optional outside macOS".to_string(),
        "Rust fallback remains deterministic".to_string(),
        "FFI buffers are bounded and null-terminated by the producer".to_string(),
    ]);

    for signal in detected {
        guardrails.insert(signal.action.clone());
    }

    guardrails.into_iter().collect()
}

fn build_metrics(
    profile: &ContextProfile,
    detected: &[DetectedSignal],
    pressure_score: u8,
    readiness_score: u8,
) -> Vec<NativeResonanceMetric> {
    let mut metrics = vec![
        NativeResonanceMetric {
            id: "pressure".into(),
            label: "Pressure".into(),
            value: pressure_score.to_string(),
            band: pressure_band(pressure_score).into(),
        },
        NativeResonanceMetric {
            id: "readiness".into(),
            label: "Readiness".into(),
            value: readiness_score.to_string(),
            band: readiness_band(readiness_score).into(),
        },
        NativeResonanceMetric {
            id: "entropy".into(),
            label: "Context entropy".into(),
            value: format!("{:.3}", profile.entropy),
            band: if profile.entropy > 0.72 {
                "rich".into()
            } else {
                "plain".into()
            },
        },
        NativeResonanceMetric {
            id: "signals".into(),
            label: "Detected signals".into(),
            value: detected.len().to_string(),
            band: if detected.len() >= 4 {
                "dense".into()
            } else if detected.is_empty() {
                "baseline".into()
            } else {
                "focused".into()
            },
        },
    ];

    for signal in detected {
        metrics.push(NativeResonanceMetric {
            id: format!("signal-{}", signal.id),
            label: signal.label.clone(),
            value: signal.hits.join(","),
            band: format!("weight-{}", signal.weight),
        });
    }

    metrics
}

fn build_risk_register(
    detected: &[DetectedSignal],
    pressure_score: u8,
) -> Vec<NativeResonanceRisk> {
    let mut risks = detected
        .iter()
        .map(|signal| NativeResonanceRisk {
            id: format!("risk-{}", signal.id),
            severity: if pressure_score >= 75 {
                "high".into()
            } else if signal.id == "security" || signal.id == "privacy" {
                "medium".into()
            } else {
                "low".into()
            },
            description: signal.risk.clone(),
            mitigation: signal.action.clone(),
        })
        .collect::<Vec<_>>();

    if risks.is_empty() {
        risks.push(NativeResonanceRisk {
            id: "risk-baseline".into(),
            severity: "low".into(),
            description: "No strong native signal found in the request.".into(),
            mitigation: "Return a conservative baseline report.".into(),
        });
    }

    risks
}

fn build_next_actions(detected: &[DetectedSignal], readiness_score: u8) -> Vec<String> {
    let ids = detected_ids(detected);
    let mut actions = vec![
        "Run cargo fmt on the Tauri crate".to_string(),
        "Run cargo check on the Tauri crate".to_string(),
        "Review git diff before staging".to_string(),
    ];

    if ids.contains("swift") {
        actions.push("On macOS, compile-link the Swift symbols before release packaging".into());
    }
    if ids.contains("privacy") {
        actions.push("Confirm no local secrets or generated runtime state entered the diff".into());
    }
    if readiness_score >= 88 {
        actions.push("Commit the scoped native source changes".into());
    } else {
        actions.push("Keep the report behind a command until UI copy is ready".into());
    }

    actions
}

fn detected_ids(detected: &[DetectedSignal]) -> BTreeSet<String> {
    detected
        .iter()
        .map(|signal| signal.id.clone())
        .collect::<BTreeSet<_>>()
}

fn pressure_band(score: u8) -> &'static str {
    match score {
        0..=29 => "calm",
        30..=54 => "active",
        55..=74 => "heated",
        _ => "overdrive",
    }
}

fn readiness_band(score: u8) -> &'static str {
    match score {
        0..=39 => "cold",
        40..=64 => "warming",
        65..=84 => "ready",
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
    fn sanitizer_removes_control_bytes_and_keeps_words() {
        let profile = profile_context("Swift\0Rust\nGUFU\tlocal");
        assert_eq!(profile.sanitized, "Swift Rust GUFU local");
        assert_eq!(profile.words, 4);
    }

    #[test]
    fn signal_detection_finds_swift_rust_and_privacy() {
        let detected = detect_signals("Swift and Rust local privacy planner");
        let ids = detected_ids(&detected);
        assert!(ids.contains("swift"));
        assert!(ids.contains("rust"));
        assert!(ids.contains("privacy"));
    }

    #[test]
    fn report_is_deterministic_for_shape_except_time() {
        let report = build_native_resonance_report("gufu swift rust commit local");
        assert_eq!(report.codename, "GUFU-Native-Resonance");
        assert!(!report.context_hash.is_empty());
        assert!(report.readiness_score >= 65);
        assert!(report
            .phases
            .iter()
            .any(|phase| phase.id == "gufu-overdrive"));
    }
}
