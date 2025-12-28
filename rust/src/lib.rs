//! Elysia Rust Library
//!
//! High-performance library for Elysia AI with cross-platform support.

pub mod text;
pub mod config;
pub mod error;

pub use error::{Error, Result};

/// Library version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Initialize Elysia logger
pub fn init_logger() {
    #[cfg(feature = "cli")]
    {
        use tracing_subscriber::filter::LevelFilter;

        tracing_subscriber::fmt()
            .with_max_level(LevelFilter::INFO)
            .init();
    }
}

/// Get library metadata
pub struct LibraryInfo {
    pub name: &'static str,
    pub version: &'static str,
    pub os: &'static str,
    pub arch: &'static str,
}

impl LibraryInfo {
    pub fn get() -> Self {
        LibraryInfo {
            name: env!("CARGO_PKG_NAME"),
            version: VERSION,
            os: std::env::consts::OS,
            arch: std::env::consts::ARCH,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_library_info() {
        let info = LibraryInfo::get();
        assert_eq!(info.name, "elysia-rust");
        assert!(!info.version.is_empty());
    }
}
