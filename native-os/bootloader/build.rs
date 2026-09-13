use std::{env, path::PathBuf};

fn main() {
    println!("cargo:rerun-if-env-changed=ELYSIA_KERNEL_PATH");
    println!("cargo:rerun-if-env-changed=ELYSIA_BOOT_MODE");
    let path = PathBuf::from(
        env::var_os("ELYSIA_KERNEL_PATH")
            .expect("build the kernel first and set ELYSIA_KERNEL_PATH; see native-os/README.md"),
    );
    let path = path.canonicalize().expect("kernel ELF does not exist");
    println!("cargo:rerun-if-changed={}", path.display());
    println!("cargo:rustc-env=ELYSIA_KERNEL_PATH={}", path.display());
}
