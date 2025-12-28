//! Configuration management

use serde::{Deserialize, Serialize};
use crate::Result;

/// Elysia configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub debug: bool,
    pub log_level: String,
    #[serde(default)]
    pub platform: String,
}

impl Config {
    pub fn new() -> Self {
        Config {
            debug: cfg!(debug_assertions),
            log_level: "info".to_string(),
            platform: format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH),
        }
    }

    pub fn from_json(json: &str) -> Result<Self> {
        Ok(serde_json::from_str(json)?)
    }

    pub fn to_json(&self) -> Result<String> {
        Ok(serde_json::to_string_pretty(self)?)
    }
}

impl Default for Config {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_creation() {
        let config = Config::new();
        assert!(!config.platform.is_empty());
    }

    #[test]
    fn test_config_serialization() {
        let config = Config::new();
        let json = config.to_json().unwrap();
        let restored: Config = serde_json::from_str(&json).unwrap();
        assert_eq!(config.log_level, restored.log_level);
    }
}
