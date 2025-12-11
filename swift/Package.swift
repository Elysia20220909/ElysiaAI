// swift-tools-version: 6.0
// Elysia AI - Swift Integration
// iOS/macOS Native Client for Elysia AI Chat

import PackageDescription

let package = Package(
    name: "ElysiaAI",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "ElysiaAI",
            targets: ["ElysiaAI"]
        ),
        .executable(
            name: "ElysiaAICLI",
            targets: ["ElysiaAICLI"]
        )
    ],
    dependencies: [
        // Async HTTP client
        .package(url: "https://github.com/swift-server/async-http-client.git", from: "1.23.0"),
        // JSON handling
        .package(url: "https://github.com/apple/swift-algorithms", from: "1.2.0"),
        // Logging
        .package(url: "https://github.com/apple/swift-log.git", from: "1.6.0")
    ],
    targets: [
        .target(
            name: "ElysiaAI",
            dependencies: [
                .product(name: "AsyncHTTPClient", package: "async-http-client"),
                .product(name: "Algorithms", package: "swift-algorithms"),
                .product(name: "Logging", package: "swift-log")
            ]
        ),
        .executableTarget(
            name: "ElysiaAICLI",
            dependencies: ["ElysiaAI"]
        ),
        .testTarget(
            name: "ElysiaAITests",
            dependencies: ["ElysiaAI"]
        )
    ]
)
