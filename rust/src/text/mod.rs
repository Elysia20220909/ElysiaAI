//! Text processing module

use unicode_normalization::UnicodeNormalization;
use crate::Result;

/// Text processor
pub struct TextProcessor;

impl TextProcessor {
    /// Normalize unicode text
    pub fn normalize(text: &str) -> String {
        text.nfc().collect()
    }

    /// Convert to lowercase
    pub fn to_lowercase(text: &str) -> String {
        text.to_lowercase()
    }

    /// Convert to uppercase
    pub fn to_uppercase(text: &str) -> String {
        text.to_uppercase()
    }

    /// Split text by delimiter
    pub fn split(text: &str, delimiter: &str) -> Vec<String> {
        text.split(delimiter)
            .map(|s| s.to_string())
            .collect()
    }

    /// Count words in text
    pub fn word_count(text: &str) -> usize {
        text.split_whitespace().count()
    }

    /// Truncate text to max length
    pub fn truncate(text: &str, max_len: usize) -> String {
        if text.len() <= max_len {
            text.to_string()
        } else {
            format!("{}...", &text[..max_len.saturating_sub(3)])
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize() {
        let normalized = TextProcessor::normalize("café");
        assert_eq!(normalized, "café");
    }

    #[test]
    fn test_word_count() {
        let count = TextProcessor::word_count("hello world test");
        assert_eq!(count, 3);
    }

    #[test]
    fn test_truncate() {
        let truncated = TextProcessor::truncate("hello world", 5);
        assert_eq!(truncated, "he...");
    }
}
