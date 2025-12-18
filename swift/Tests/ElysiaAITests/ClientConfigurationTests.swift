import XCTest
@testable import ElysiaAI

final class ElysiaErrorTests: XCTestCase {
    
    func testElysiaErrorDescription() {
        XCTAssertEqual(ElysiaError.serverUnavailable.description, "Server unavailable")
        XCTAssertEqual(ElysiaError.invalidResponse.description, "Invalid response format")
        XCTAssertEqual(ElysiaError.timeout.description, "Request timeout")
    }
    
    func testElysiaErrorLocalizedDescription() {
        XCTAssertNotNil(ElysiaError.serverUnavailable.localizedDescription)
        XCTAssertFalse(ElysiaError.serverUnavailable.localizedDescription.isEmpty)
    }
    
    func testCustomError() {
        let customError = ElysiaError.custom("Custom error message")
        XCTAssertEqual(customError.description, "Custom error message")
    }
    
    func testErrorEquality() {
        XCTAssertEqual(
            ElysiaError.serverUnavailable,
            ElysiaError.serverUnavailable
        )
        XCTAssertNotEqual(
            ElysiaError.serverUnavailable,
            ElysiaError.timeout
        )
    }
}

final class ClientConfigurationTests: XCTestCase {
    
    func testClientInitialization() {
        let url = URL(string: "http://localhost:3000")!
        let client = ElysiaClient(serverURL: url, timeout: 30.0)
        
        XCTAssertNotNil(client)
    }
    
    func testClientWithCustomTimeout() {
        let url = URL(string: "http://example.com")!
        let client = ElysiaClient(serverURL: url, timeout: 60.0)
        
        XCTAssertNotNil(client)
    }
    
    func testDefaultTimeout() {
        let url = URL(string: "http://localhost:3000")!
        let client = ElysiaClient(serverURL: url)  // Uses default 30.0
        
        XCTAssertNotNil(client)
    }
    
    func testURLWithPort() {
        let url = URL(string: "http://localhost:8080")!
        let client = ElysiaClient(serverURL: url)
        
        XCTAssertNotNil(client)
    }
    
    func testURLWithPath() {
        let url = URL(string: "http://api.example.com/v1")!
        let client = ElysiaClient(serverURL: url)
        
        XCTAssertNotNil(client)
    }
}
