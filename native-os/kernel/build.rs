use std::{env, path::PathBuf};
fn main() {
    println!("cargo:rerun-if-changed=linker.ld");
    println!("cargo:rerun-if-env-changed=ELYSIA_USER_ELF");
    if env::var("TARGET").as_deref() == Ok("x86_64-unknown-none") {
        let path = PathBuf::from(env::var_os("ELYSIA_USER_ELF").expect(
            "build elysia-user-probe first and set ELYSIA_USER_ELF; see native-os/README.md",
        ));
        let path = path.canonicalize().expect("user ELF missing");
        println!("cargo:rerun-if-changed={}", path.display());
        println!("cargo:rustc-env=ELYSIA_USER_ELF={}", path.display());
    }
}
