use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Internal system error: {0}")]
    Internal(String),

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("Security violation: {0}")]
    Security(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Environment error: {0}")]
    Env(String),

    #[error("Classification error: {0}")]
    Classification(String),
}

// Implement Serialize for AppError so Tauri can send it to the frontend
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
