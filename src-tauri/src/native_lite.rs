use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const MAX_FILES_PER_BUDGET: u32 = 2_500;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeLiteLane {
    pub id: String,
    pub name: String,
    pub role: String,
    pub status: String,
    pub detail: String,
    pub weight: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeLiteBudget {
    pub id: String,
    pub label: String,
    pub path: String,
    pub bytes: u64,
    pub files: u32,
    pub truncated: bool,
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeLiteSnapshot {
    pub codename: String,
    pub generated_at: u64,
    pub mode: String,
    pub summary: String,
    pub score: u8,
    pub lanes: Vec<NativeLiteLane>,
    pub budgets: Vec<NativeLiteBudget>,
    pub commands: Vec<String>,
}

struct BudgetTarget {
    id: &'static str,
    label: &'static str,
    path: &'static str,
    action: &'static str,
}

const BUDGET_TARGETS: &[BudgetTarget] = &[
    BudgetTarget {
        id: "node-modules",
        label: "Node modules",
        path: "node_modules",
        action: "Keep Bun as the single package manager",
    },
    BudgetTarget {
        id: "python-venv",
        label: "Python venv",
        path: ".venv",
        action: "Use dev:lite before loading embedding models",
    },
    BudgetTarget {
        id: "tauri-target",
        label: "Rust target",
        path: "src-tauri/target",
        action: "Keep native builds incremental; clean only stale caches",
    },
    BudgetTarget {
        id: "tmp",
        label: "Temporary logs",
        path: ".tmp",
        action: "Rotate local boot logs after verification",
    },
    BudgetTarget {
        id: "uploads",
        label: "Uploads",
        path: "uploads",
        action: "Archive inactive media outside the repo",
    },
];

#[cfg(target_os = "macos")]
extern "C" {
    fn swift_native_lite_efficiency_score(bytes: f64, files: u32) -> f32;
}

fn swift_or_rust_efficiency_score(bytes: u64, files: u32, truncated_count: usize) -> u8 {
    #[cfg(target_os = "macos")]
    unsafe {
        return swift_native_lite_efficiency_score(bytes as f64, files)
            .round()
            .clamp(25.0, 100.0) as u8;
    }

    #[cfg(not(target_os = "macos"))]
    {
        let weight_penalty = ((bytes / 1024 / 1024) / 500).min(45) as i32;
        let truncation_penalty = (truncated_count as i32) * 3;
        let file_penalty = (files / 20_000).min(10) as i32;
        (88 - weight_penalty - truncation_penalty - file_penalty).clamp(25, 100) as u8
    }
}

fn now_epoch() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}

fn scan_path_size(path: &Path, max_files: u32) -> (u64, u32, bool) {
    if !path.exists() {
        return (0, 0, false);
    }

    let mut stack = vec![path.to_path_buf()];
    let mut bytes = 0_u64;
    let mut files = 0_u32;

    while let Some(current) = stack.pop() {
        let Ok(entries) = fs::read_dir(current) else {
            continue;
        };

        for entry in entries.flatten() {
            let Ok(metadata) = entry.metadata() else {
                continue;
            };

            if metadata.is_dir() {
                stack.push(entry.path());
                continue;
            }

            files += 1;
            bytes = bytes.saturating_add(metadata.len());
            if files >= max_files {
                return (bytes, files, true);
            }
        }
    }

    (bytes, files, false)
}

pub fn collect_native_lite_snapshot(project_root: PathBuf) -> NativeLiteSnapshot {
    let lanes = vec![
        NativeLiteLane {
            id: "rust".into(),
            name: "Rust Pulse Engine".into(),
            role: "Fast local scan, desktop commands, memory-safe native kernels".into(),
            status: "ready".into(),
            detail: "Running inside the Tauri native layer".into(),
            weight: "native".into(),
        },
        NativeLiteLane {
            id: "swift".into(),
            name: "Swift Resonance Layer".into(),
            role: "macOS-native scoring and Secure Enclave-ready hooks".into(),
            status: if cfg!(target_os = "macos") {
                "ready".into()
            } else {
                "fallback".into()
            },
            detail: if cfg!(target_os = "macos") {
                "Swift native scoring enabled".into()
            } else {
                "Rust fallback active on this host".into()
            },
            weight: "optional".into(),
        },
        NativeLiteLane {
            id: "bun".into(),
            name: "Bun Surface".into(),
            role: "Web API and command center fallback".into(),
            status: "ready".into(),
            detail: "Pairs with /api/native-lite for browser access".into(),
            weight: "fallback".into(),
        },
    ];

    let budgets: Vec<NativeLiteBudget> = BUDGET_TARGETS
        .iter()
        .map(|target| {
            let absolute = project_root.join(target.path);
            let (bytes, files, truncated) = scan_path_size(&absolute, MAX_FILES_PER_BUDGET);

            NativeLiteBudget {
                id: target.id.into(),
                label: target.label.into(),
                path: target.path.into(),
                bytes,
                files,
                truncated,
                action: target.action.into(),
            }
        })
        .collect();

    let total_bytes = budgets.iter().map(|budget| budget.bytes).sum::<u64>();
    let total_files = budgets.iter().map(|budget| budget.files).sum::<u32>();
    let truncated_count = budgets.iter().filter(|budget| budget.truncated).count();
    let score = swift_or_rust_efficiency_score(total_bytes, total_files, truncated_count);
    let summary = budgets
        .iter()
        .max_by_key(|budget| budget.bytes)
        .map(|budget| format!("{} is the largest sampled weight", budget.label))
        .unwrap_or_else(|| "Native lightweight lanes are ready".into());

    NativeLiteSnapshot {
        codename: "NativeLiteLab".into(),
        generated_at: now_epoch(),
        mode: "rust-swift-bun-hybrid".into(),
        summary,
        score,
        lanes,
        budgets,
        commands: vec![
            "bun scripts/manage.ts dev:lite".into(),
            "bun run native:lite".into(),
            "cargo fmt --manifest-path src-tauri/Cargo.toml".into(),
        ],
    }
}
