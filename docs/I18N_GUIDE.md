# 🌍 i18n Internationalization

## Overview

Lightweight internationalization library with automatic locale detection, pluralization, and parameter interpolation.

## Features

- ✁EMultiple locale support (en, ja, zh, ko, es, fr, de)
- ✁ENested translation keys with dot notation
- ✁EParameter interpolation `{{key}}`
- ✁EPluralization support
- ✁EAutomatic locale detection from `Accept-Language` header
- ✁EFallback locale handling
- ✁EDynamic translation updates

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
const count_ja = i18n.plural("messages", 5, "ja"); // "5件のメチE��ージ"
```

### Locale Detection

```typescript
import { getLocaleFromRequest } from "./lib/i18n";

app.get("/api/data", ({ request }) => {
  const locale = getLocaleFromRequest(request);
  return {
    message: i18n.t("common.welcome", locale),
  };
});

// Query parameter: ?locale=ja
// Header: Accept-Language: ja-JP,ja;q=0.9,en;q=0.8
```

## Translation File Format

### `locales/en.json`

```json
{
  "common": {
    "hello": "Hello",
    "welcome": "Welcome to Elysia AI"
  },
  "auth": {
    "login": "Login",
    "loginSuccess": "Login successful"
  },
  "messages": {
    "one": "{{count}} message",
    "other": "{{count}} messages"
  }
}
```

### `locales/ja.json`

```json
{
  "common": {
    "hello": "こんにちは",
    "welcome": "Elysia AIへようこそ"
  },
  "auth": {
    "login": "ログイン",
    "loginSuccess": "ログインに成功しました"
  },
  "messages": {
    "one": "{{count}}件のメチE��ージ",
    "other": "{{count}}件のメチE��ージ"
  }
}
```

## API Reference

### `i18n.t(key, locale?, params?)`

Get translation for a key.

**Parameters:**

- `key`: Translation key (dot notation)
- `locale`: Target locale (optional, uses default if not provided)
- `params`: Object with interpolation parameters (optional)

**Returns:** Translated string

### `i18n.plural(key, count, locale?, params?)`

Get pluralized translation.

**Parameters:**

- `key`: Translation key (without .one or .other)
- `count`: Number for pluralization
- `locale`: Target locale (optional)
- `params`: Additional parameters (optional)

**Returns:** Pluralized translated string

### `i18n.detectLocale(acceptLanguage?)`

Detect best matching locale from Accept-Language header.

**Parameters:**

- `acceptLanguage`: Accept-Language header value

**Returns:** Best matching supported locale

### `getLocaleFromRequest(request)`

Extract locale from HTTP request (query param or header).

**Parameters:**

- `request`: HTTP Request object

**Returns:** Detected locale

## Configuration

```typescript
import { I18n } from "./lib/i18n";

const i18n = new I18n({
  defaultLocale: "en",
  fallbackLocale: "en",
  supportedLocales: ["en", "ja", "zh", "ko"],
  localesPath: "locales",
});
```

## Environment Variables

```bash
DEFAULT_LOCALE=en
SUPPORTED_LOCALES=en,ja,zh,ko
```

## Best Practices

1. **Use descriptive keys**: `auth.loginSuccess` instead of `loginSuccess`
2. **Group related translations**: Put all auth-related keys under `auth`
3. **Provide fallbacks**: Always define English translations as fallback
4. **Test all locales**: Ensure all keys exist in all locale files
5. **Use parameters for dynamic content**: Avoid string concatenation

## Testing

```typescript
import { describe, expect, it } from "bun:test";
import { i18n, getLocaleFromRequest } from "./lib/i18n";

describe("i18n", () => {
  it("should translate to Japanese", () => {
    expect(i18n.t("common.hello", "ja")).toBe("こんにちは");
  });

  it("should interpolate parameters", () => {
    const text = i18n.t("validation.required", "en", { field: "Username" });
    expect(text).toContain("Username");
  });

  it("should detect locale from header", () => {
    const request = new Request("http://localhost", {
      headers: { "Accept-Language": "ja-JP,ja;q=0.9" },
    });
    expect(getLocaleFromRequest(request)).toBe("ja");
  });
});
```
