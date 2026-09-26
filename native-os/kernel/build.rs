use std::{env, path::PathBuf};
fn main() {
    println!("cargo:rerun-if-env-changed=ELYSIA_BUDGET_RECOVERY");
    let recovery = env::var("ELYSIA_BUDGET_RECOVERY").unwrap_or_else(|_| "off".into());
    assert!(matches!(
        recovery.as_str(),
        "off" | "retry" | "cut-replan" | "cut-launch"
    ));
    println!("cargo:rustc-env=ELYSIA_BUDGET_RECOVERY={recovery}");
    println!("cargo:rerun-if-changed=linker.ld");
    for key in [
        "ELYSIA_USER_ELF",
        "ELYSIA_SERVICE_ELF",
        "ELYSIA_CLIENT_ELF",
        "ELYSIA_INFERENCE_ELF",
        "ELYSIA_SIZED_ELF",
        "ELYSIA_SIZED_ID",
        "ELYSIA_ARENA_POLICY",
    ] {
        println!("cargo:rerun-if-env-changed={key}");
        if env::var("TARGET").as_deref() == Ok("x86_64-unknown-none") {
            let path = PathBuf::from(
                env::var_os(key).expect("build user ELF bundles first; see native-os/README.md"),
            );
            let path = path.canonicalize().expect("user ELF missing");
            println!("cargo:rerun-if-changed={}", path.display());
            println!("cargo:rustc-env={key}={}", path.display());
        }
    }
}
