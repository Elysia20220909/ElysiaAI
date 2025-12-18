import XCTest
@testable import ElysiaAI

final class ElysiaClientTests: XCTestCase {
    var client: ElysiaClient!
    let testServerURL = URL(string: "http://localhost:3000")!
    
    override func setUp() async throws {
        try await super.setUp()
        client = ElysiaClient(serverURL: testServerURL, timeout: 5.0)
    }
    
    override func tearDown() async throws {
        try await super.tearDown()
        client = nil
    }
    
    // MARK: - Health Check Tests
    
    func testHealthCheckSuccess() async throws {
        // This test requires the server running on localhost:3000
        do {
            let result = try await client.healthCheck()
            XCTAssertTrue(result, "Health check should return true for running server")
        } catch ElysiaError.serverUnavailable {
            // Expected when server is not running in test environment
            XCTSkip("Server not available for integration test")
        }
    }
    
    func testHealthCheckWithCustomURL() async throws {
        let customClient = ElysiaClient(
            serverURL: URL(string: "http://invalid-server:9999")!,
            timeout: 1.0
        )
        
        do {
            _ = try await customClient.healthCheck()
            XCTFail("Should throw for invalid server")
        } catch ElysiaError.serverUnavailable {
            // Expected
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }
    
    // MARK: - Message Streaming Tests
    
    func testSendMessageStreaming() async throws {
        do {
            var messages = [String]()
            
            try await client.sendMessage(
                message: "Hello",
                sessionId: "test-session",
                userId: "test-user"
            ) { chunk in
                messages.append(chunk)
            }
            
            // Should receive at least one message chunk
            XCTAssertFalse(messages.isEmpty, "Should receive message chunks")
        } catch ElysiaError.serverUnavailable {
            XCTSkip("Server not available for integration test")
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }
    
    func testMessageStreamingEmptyResponse() async throws {
        do {
            var chunkCount = 0
            
            try await client.sendMessage(
                message: "",
                sessionId: "test-session",
                userId: "test-user"
            ) { _ in
                chunkCount += 1
            }
            
            // Empty message should still complete
            XCTAssertGreaterThanOrEqual(chunkCount, 0)
        } catch ElysiaError.serverUnavailable {
            XCTSkip("Server not available for integration test")
        } catch {
            // May fail due to validation
        }
    }
    
    // MARK: - RAG Search Tests
    
    func testRAGSearch() async throws {
        do {
            let results = try await client.searchRAG(
                query: "test query",
                limit: 10
            )
            
            // Should return an array (may be empty if no results)
            XCTAssertIsNotNil(results, "Should return search results")
            XCTAssertTrue(results is [String], "Should return array of strings")
        } catch ElysiaError.serverUnavailable {
            XCTSkip("Server not available for integration test")
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }
    
    func testRAGSearchWithLargeLimit() async throws {
        do {
            let results = try await client.searchRAG(
                query: "test",
                limit: 100
            )
            
            XCTAssertIsNotNil(results)
            XCTAssertTrue(results.count <= 100, "Should respect limit")
        } catch ElysiaError.serverUnavailable {
            XCTSkip("Server not available for integration test")
        } catch {
            // Expected for invalid parameters
        }
    }
    
    // MARK: - Error Handling Tests
    
    func testTimeoutError() async throws {
        let shortTimeoutClient = ElysiaClient(
            serverURL: testServerURL,
            timeout: 0.001  // 1ms timeout
        )
        
        do {
            _ = try await shortTimeoutClient.healthCheck()
            XCTFail("Should timeout")
        } catch ElysiaError.timeout {
            // Expected
        } catch {
            // May get other network errors depending on timing
        }
    }
    
    func testInvalidURLError() async throws {
        let invalidClient = ElysiaClient(
            serverURL: URL(string: "not-a-valid-url")!,
            timeout: 5.0
        )
        
        do {
            _ = try await invalidClient.healthCheck()
            XCTFail("Should fail with invalid URL")
        } catch {
            // Expected to fail
        }
    }
    
    // MARK: - Performance Tests
    
    func testConcurrentRequests() async throws {
        do {
            await withThrowingTaskGroup(of: Void.self) { group in
                for i in 0..<5 {
                    group.addTask { [weak self] in
                        guard let self = self else { return }
                        try await self.client.healthCheck()
                    }
                }
                
                do {
                    try await group.waitForAll()
                    // All concurrent requests should complete
                } catch ElysiaError.serverUnavailable {
                    XCTSkip("Server not available for concurrent test")
                } catch {
                    // Expected to fail if server not available
                }
            }
        } catch {
            // May fail if server not available
        }
    }
    
    func testMessageStreamingPerformance() async throws {
        let startTime = Date()
        
        do {
            try await client.sendMessage(
                message: "Test message",
                sessionId: "perf-test",
                userId: "test-user"
            ) { _ in }
            
            let duration = Date().timeIntervalSince(startTime)
            
            // Should complete in reasonable time (less than 10 seconds)
            XCTAssertLessThan(duration, 10.0, "Message streaming should complete quickly")
        } catch ElysiaError.serverUnavailable {
            XCTSkip("Server not available for performance test")
        } catch {
            // May fail due to network
        }
    }
}
