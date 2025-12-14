# Elysia AI - Swift Client

SwiftネイティブクライアントでiOS/macOSからElysiaちゃんとチャット♡

## Features

- ✅ **Async/Await**: モダンなSwift Concurrency対応
- ✅ **Streaming**: リアルタイムストリーミングレスポンス
- ✅ **Cross-Platform**: iOS 15+ / macOS 12+
- ✅ **Type-Safe**: 完全な型安全性
- ✅ **CLI Tool**: コマンドラインツール付き

## Requirements

- Swift 5.9+
- iOS 15.0+ / macOS 12.0+
- Xcode 15.0+ (for iOS development)

## Installation

### Swift Package Manager

```swift
dependencies: [
    .package(url: "https://github.com/chloeamethyst/ElysiaJS.git", from: "1.0.0")
]
```

### Build from Source

```bash
cd swift
swift build -c release
```

## Usage

### CLI Tool

```bash
# サーバーをデフォルトURL(localhost:3000)で起動
swift run ElysiaAICLI

# カスタムURL指定
ELYSIA_URL=http://your-server:3000 swift run ElysiaAICLI
```

### As Library

```swift
import ElysiaAI

// クライアント作成
let config = ElysiaClient.Configuration(
    baseURL: "http://localhost:3000"
)
let client = ElysiaClient(configuration: config)

// チャット送信
let messages = [
    ElysiaClient.Message(role: "user", content: "こんにちは！")
]

let stream = try await client.sendMessage(messages: messages)
for try await chunk in stream {
    print(chunk, terminator: "")
}

// RAG検索
let ragResponse = try await client.searchRAG(query: "エリシアの名言")
print("Context: \(ragResponse.context)")
```

### iOS App Example

```swift
import SwiftUI
import ElysiaAI

@MainActor
class ChatViewModel: ObservableObject {
    @Published var messages: [Message] = []
    @Published var currentResponse = ""

    private let client = ElysiaClient()

    func sendMessage(_ text: String) async {
        let userMessage = Message(role: "user", content: text)
        messages.append(userMessage)

        currentResponse = ""

        do {
            let stream = try await client.sendMessage(messages: messages)
            for try await chunk in stream {
                currentResponse += chunk
            }

            let assistantMessage = Message(role: "assistant", content: currentResponse)
            messages.append(assistantMessage)
        } catch {
            print("Error: \(error)")
        }
    }
}
```

## API Reference

### ElysiaClient

```swift
class ElysiaClient {
    init(configuration: Configuration = Configuration())

    // ストリーミングチャット
    func sendMessage(messages: [Message]) async throws
        -> AsyncThrowingStream<String, Error>

    // RAG検索
    func searchRAG(query: String) async throws -> RAGResponse

    // ヘルスチェック
    func healthCheck() async throws -> Bool
}
```

### Configuration

```swift
struct Configuration {
    let baseURL: String           // デフォルト: "http://localhost:3000"
    let timeout: TimeAmount       // デフォルト: 30秒
    let logLevel: Logger.Level    // デフォルト: .info
}
```

## Testing

```bash
swift test
```

## Development

### Build Debug

```bash
swift build
```

### Run Tests

```bash
swift test --parallel
```

### Generate Xcode Project

```bash
swift package generate-xcodeproj
```

## License

MIT License - See root LICENSE file
