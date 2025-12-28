// Build script for Elysia Rust

fn main() {
    // Set up platform-specific compilation flags
    println!("cargo:rustc-env=TARGET={}", std::env::var("TARGET").unwrap());

    #[cfg(target_os = "windows")]
    {
        println!("cargo:rustc-link-search=native=C:\\Program Files\\LLVM\\lib");
    }

    #[cfg(target_os = "macos")]
    {
        println!("cargo:rustc-link-search=framework=/Library/Frameworks");
        println!("cargo:rustc-link-search=native=/usr/local/lib");
    }

    println!("cargo:rerun-if-changed=build.rs");
}
