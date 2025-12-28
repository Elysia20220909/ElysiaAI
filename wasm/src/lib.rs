// WebAssembly bindings for Elysia

use wasm_bindgen::prelude::*;
use elysia_rust::TextProcessor;

#[wasm_bindgen]
pub struct ElysiasWasm;

#[wasm_bindgen]
impl ElysiasWasm {
    /// Normalize text
    #[wasm_bindgen]
    pub fn normalize(text: &str) -> String {
        TextProcessor::normalize(text)
    }

    /// Tokenize text
    #[wasm_bindgen]
    pub fn tokenize(text: &str) -> Vec<JsValue> {
        TextProcessor::split(text, " ")
            .iter()
            .map(|s| JsValue::from_str(s))
            .collect()
    }

    /// Count words
    #[wasm_bindgen]
    pub fn word_count(text: &str) -> usize {
        TextProcessor::word_count(text)
    }

    /// Truncate text
    #[wasm_bindgen]
    pub fn truncate(text: &str, max_len: usize) -> String {
        TextProcessor::truncate(text, max_len)
    }

    /// Convert to lowercase
    #[wasm_bindgen]
    pub fn to_lowercase(text: &str) -> String {
        TextProcessor::to_lowercase(text)
    }

    /// Convert to uppercase
    #[wasm_bindgen]
    pub fn to_uppercase(text: &str) -> String {
        TextProcessor::to_uppercase(text)
    }

    /// Get library version
    #[wasm_bindgen]
    pub fn version() -> String {
        format!("elysia-wasm 1.0.0")
    }

    /// Get feature info
    #[wasm_bindgen]
    pub fn info() -> String {
        format!(
            "Elysia WebAssembly Module - High-performance text processing"
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize() {
        let result = ElysiasWasm::normalize("  hello   world  ");
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_word_count() {
        let result = ElysiasWasm::word_count("hello world test");
        assert_eq!(result, 3);
    }
}
