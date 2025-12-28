//! Error types for Elysia

use thiserror::Error;

/// Elysia error type
#[derive(Error, Debug)]
pub enum Error {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Text processing error: {0}")]
    TextProcessing(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[cfg(target_os = "windows")]
    #[error("Windows API error: {0}")]
    WinApi(String),

    #[cfg(target_os = "macos")]
    #[error("macOS API error: {0}")]
    MacOS(String),
}

/// Result type for Elysia operations
pub type Result<T> = std::result::Result<T, Error>;
