use std::{env, path::PathBuf};
fn main() {
    println!("cargo:rerun-if-changed=linker.ld");
    for key in ["ELYSIA_USER_ELF", "ELYSIA_SERVICE_ELF"] {
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
