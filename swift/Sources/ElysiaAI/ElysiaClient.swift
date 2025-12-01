import Foundation
import AsyncHTTPClient
import NIOCore
import NIOHTTP1
import Logging

/// Elysia AI Chat Client
/// Swiftネイティブクライアント - iOS/macOS対応
public class ElysiaClient {
    // MARK: - Properties
    
    private let httpClient: HTTPClient
    private let baseURL: String
    private let logger: Logger
    private let decoder: JSONDecoder
    
    // MARK: - Configuration
    
    public struct Configuration {
        public let baseURL: String
        public let timeout: TimeAmount
        public let logLevel: Logger.Level
        
        public init(
            baseURL: String = "http://localhost:3000",
            timeout: TimeAmount = .seconds(30),
            logLevel: Logger.Level = .info
        ) {
            self.baseURL = baseURL
            self.timeout = timeout
            self.logLevel = logLevel
        }
    }
    
    // MARK: - Models
    
    public struct Message: Codable, Sendable {
        public let role: String
        public let content: String
        
        public init(role: String, content: String) {
            self.role = role
            self.content = content
        }
    }
    
    public struct ChatRequest: Codable, Sendable {
        public let messages: [Message]
        
        public init(messages: [Message]) {
            self.messages = messages
        }
    }
    
    public struct RAGResponse: Codable, Sendable {
        public let context: String
        public let quotes: [String]
        
        enum CodingKeys: String, CodingKey {
            case context
            case quotes
        }
    }
    
    // MARK: - Initialization
    
    public init(configuration: Configuration = Configuration()) {
        self.httpClient = HTTPClient(eventLoopGroupProvider: .singleton)
        self.baseURL = configuration.baseURL
        self.decoder = JSONDecoder()
        
        var logger = Logger(label: "com.elysia.ai.client")
        logger.logLevel = configuration.logLevel
        self.logger = logger
    }
    
    deinit {
        try? httpClient.syncShutdown()
    }
    
    // MARK: - Public API
    
    /// チャットメッセージを送信 (ストリーミング)
    public func sendMessage(
        messages: [Message]
    ) async throws -> AsyncThrowingStream<String, Error> {
        let request = ChatRequest(messages: messages)
        let requestBody = try JSONEncoder().encode(request)
        
        var httpRequest = HTTPClientRequest(url: "\(baseURL)/elysia-love")
        httpRequest.method = .POST
        httpRequest.headers.add(name: "Content-Type", value: "application/json")
        httpRequest.body = .bytes(requestBody)
        
        logger.info("Sending chat request to \(baseURL)")
        
        let response = try await httpClient.execute(httpRequest, timeout: .seconds(60))
        
        guard response.status == .ok else {
            logger.error("HTTP error: \(response.status)")
            throw ElysiaError.httpError(response.status.code)
        }
        
        return AsyncThrowingStream { continuation in
            Task {
                do {
                    var buffer = ""
                    for try await chunk in response.body {
                        if let text = String(buffer: chunk) {
                            buffer += text
                            // Send accumulated text
                            continuation.yield(text)
                        }
                    }
                    continuation.finish()
                } catch {
                    logger.error("Stream error: \(error)")
                    continuation.finish(throwing: error)
                }
            }
        }
    }
    
    /// RAG検索を実行
    public func searchRAG(query: String) async throws -> RAGResponse {
        struct RAGRequest: Codable {
            let text: String
        }
        
        let request = RAGRequest(text: query)
        let requestBody = try JSONEncoder().encode(request)
        
        // RAGエンドポイントはポート8000を使用
        let ragURL: String
        if let url = URL(string: baseURL), let host = url.host {
            let scheme = url.scheme ?? "http"
            let ragPort = 8000
            ragURL = "\(scheme)://\(host):\(ragPort)/rag"
        } else {
            ragURL = "\(baseURL)/rag"
        }
        
        var httpRequest = HTTPClientRequest(url: ragURL)
        httpRequest.method = .POST
        httpRequest.headers.add(name: "Content-Type", value: "application/json")
        httpRequest.body = .bytes(requestBody)
        
        logger.info("Searching RAG: \(query)")
        
        let response = try await httpClient.execute(httpRequest, timeout: .seconds(10))
        
        guard response.status == .ok else {
            logger.error("RAG HTTP error: \(response.status)")
            throw ElysiaError.httpError(response.status.code)
        }
        
        let body = try await response.body.collect(upTo: 1024 * 1024) // 1MB max
        let ragResponse = try decoder.decode(RAGResponse.self, from: body)
        
        logger.info("RAG search completed: \(ragResponse.quotes.count) quotes found")
        return ragResponse
    }
    
    /// ヘルスチェック
    public func healthCheck() async throws -> Bool {
        var request = HTTPClientRequest(url: "\(baseURL)/")
        request.method = .GET
        
        let response = try await httpClient.execute(request, timeout: .seconds(5))
        return response.status == .ok
    }
}

// MARK: - Errors

public enum ElysiaError: Error, LocalizedError {
    case httpError(UInt)
    case decodingError(Error)
    case networkError(Error)
    case invalidURL
    
    public var errorDescription: String? {
        switch self {
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidURL:
            return "Invalid URL"
        }
    }
}
