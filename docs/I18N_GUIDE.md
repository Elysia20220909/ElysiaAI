# 🌍 i18n: Internationalization Guide

ElysiaAI provides a lightweight internationalization library with automatic locale detection, pluralization, and parameter interpolation.

## Features

- ✨ **Multiple locale support**: en, ja, zh, ko, es, fr, de.
- 🎯 **Nested translation keys**: Easy organization with dot notation.
- 🔄 **Parameter interpolation**: Use `{{key}}` for dynamic content.
- ⚖️ **Pluralization support**: Handle singular/plural forms naturally.
- 🔍 **Automatic locale detection**: Based on `Accept-Language` headers or query params.
- 🛡️ **Fallback locale handling**: Always provides a result even if translation is missing.

## Usage

### Basic Translation

```typescript
import { i18n } from "./lib/i18n";

// Simple translation
const greeting = i18n.t("common.hello", "en"); // "Hello"
const greeting_ja = i18n.t("common.hello", "ja"); // "こんにちは"

// Nested keys
const welcome = i18n.t("auth.loginSuccess", "en"); // "Login successful"
```

### Parameter Interpolation

```typescript
// Translation with parameters
const message = i18n.t("validation.required", "en", { field: "Username" });
// "Username is required"

const length = i18n.t("validation.minLength", "en", { field: "Password", min: 8 });
// "Password must be at least 8 characters"
```

### Pluralization

```typescript
// Automatic pluralization
const count1 = i18n.plural("messages", 1, "en"); // "1 message"
const count5 = i18n.plural("messages", 5, "en"); // "5 messages"

// Japanese (same for singular and plural)
const count_ja = i18n.plural("messages", 5, "ja"); // "5件のメッセージ"
```

## Best Practices

1. **Use descriptive keys**: `auth.loginSuccess` instead of just `loginSuccess`.
2. **Group related translations**: Put all auth-related keys under an `auth` object.
3. **Provide fallbacks**: Always define English translations as the primary fallback.
4. **Test all locales**: Ensure all keys exist in all locale files to avoid empty strings.
5. **Use parameters**: Avoid string concatenation to maintain natural word order in different languages.

---
© 2026 Elysia20220909 // ElysiaAI
