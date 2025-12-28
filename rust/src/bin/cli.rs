//! Command-line interface for Elysia Rust

use elysia_rust::{LibraryInfo, config::Config};

fn main() {
    let info = LibraryInfo::get();

    println!("Elysia Rust CLI");
    println!("===============");
    println!("Name:    {}", info.name);
    println!("Version: {}", info.version);
    println!("OS:      {}", info.os);
    println!("Arch:    {}", info.arch);

    let config = Config::new();
    if let Ok(json) = config.to_json() {
        println!("\nConfiguration:");
        println!("{}", json);
    }
}
