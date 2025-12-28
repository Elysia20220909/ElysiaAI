// Tests for Elysia Rust library

#[cfg(test)]
mod tests {
    use elysia_rust::{TextProcessor, Config, LibraryInfo};

    #[test]
    fn test_normalize() {
        let normalized = TextProcessor::normalize("  hello   world  ");
        assert_eq!(normalized, "hello world");
    }

    #[test]
    fn test_normalize_empty() {
        let normalized = TextProcessor::normalize("   ");
        assert_eq!(normalized, "");
    }

    #[test]
    fn test_word_count() {
        assert_eq!(TextProcessor::word_count("hello world"), 2);
        assert_eq!(TextProcessor::word_count("one"), 1);
        assert_eq!(TextProcessor::word_count(""), 0);
    }

    #[test]
    fn test_word_count_multispace() {
        assert_eq!(TextProcessor::word_count("hello  \t  world"), 2);
    }

    #[test]
    fn test_truncate() {
        assert_eq!(TextProcessor::truncate("hello", 10), "hello");
        assert_eq!(TextProcessor::truncate("hello world", 5), "he...");
        assert_eq!(TextProcessor::truncate("test", 4), "test");
    }

    #[test]
    fn test_to_lowercase() {
        assert_eq!(TextProcessor::to_lowercase("HELLO"), "hello");
        assert_eq!(TextProcessor::to_lowercase("HeLLo"), "hello");
    }

    #[test]
    fn test_to_uppercase() {
        assert_eq!(TextProcessor::to_uppercase("hello"), "HELLO");
        assert_eq!(TextProcessor::to_uppercase("HeLLo"), "HELLO");
    }

    #[test]
    fn test_split() {
        let result = TextProcessor::split("a,b,c", ",");
        assert_eq!(result, vec!["a", "b", "c"]);
    }

    #[test]
    fn test_config_serialization() {
        let config = Config::new();
        let json = config.to_json().unwrap();
        assert!(json.contains("elysia-rust"));
    }

    #[test]
    fn test_library_info() {
        let info = LibraryInfo::get();
        assert_eq!(info.name, "elysia-rust");
        assert!(!info.version.is_empty());
        assert!(!info.os.is_empty());
        assert!(!info.arch.is_empty());
    }
}
