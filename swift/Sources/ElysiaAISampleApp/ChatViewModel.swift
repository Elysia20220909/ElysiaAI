import SwiftUI
import ElysiaAI

/// ViewModel for managing chat state and ElysiaAI client interactions
@MainActor
class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var inputText = ""
    @Published var isLoading = false
    @Published var connectionStatus = "Connecting..."
    @Published var showError = false
    @Published var errorMessage = ""
    @Published var showRAGOptions = false
    @Published var useRAGSearch = false
    @Published var ragLimit = 10
    
    private let client: ElysiaClient
    private var sessionId: String
    private let userId: String
    
    init(serverURL: URL = URL(string: "http://localhost:3000")!) {
        self.client = ElysiaClient(serverURL: serverURL, timeout: 30.0)
        self.sessionId = UUID().uuidString
        self.userId = UIDevice.current.identifierForVendor?.uuidString ?? "anonymous"
    }
    
    // MARK: - Public Methods
    
    func sendMessage() async {
        let message = inputText.trimmingCharacters(in: .whitespaces)
        guard !message.isEmpty else { return }
        
        inputText = ""
        
        // Add user message to display
        let userMessage = ChatMessage(content: message, isUser: true)
        messages.append(userMessage)
        
        isLoading = true
        defer { isLoading = false }
        
        do {
            var assistantResponse = ""
            
            // Use RAG search if enabled
            if useRAGSearch {
                await performRAGSearchForMessage(message, into: &assistantResponse)
            }
            
            // Send message with streaming
            try await client.sendMessage(
                message: message,
                sessionId: sessionId,
                userId: userId
            ) { chunk in
                assistantResponse += chunk
            }
            
            // Add assistant response
            let assistantMessage = ChatMessage(content: assistantResponse, isUser: false)
            messages.append(assistantMessage)
            
        } catch {
            showErrorMessage(String(describing: error))
            // Remove user message on error
            messages.removeLast()
        }
    }
    
    func performRAGSearch() async {
        let query = inputText.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else {
            showErrorMessage("Please enter a search query")
            return
        }
        
        isLoading = true
        defer { isLoading = false }
        
        do {
            let results = try await client.searchRAG(query: query, limit: ragLimit)
            
            let responseText = formatRAGResults(results)
            let message = ChatMessage(content: "RAG Search Results:\n\n\(responseText)", isUser: false)
            messages.append(message)
            
        } catch {
            showErrorMessage("RAG Search failed: \(error)")
        }
    }
    
    func checkHealth() async {
        do {
            let isHealthy = try await client.healthCheck()
            connectionStatus = isHealthy ? "🟢 Connected" : "🟡 Degraded"
        } catch {
            connectionStatus = "🔴 Disconnected"
            showErrorMessage("Server connection failed: \(error)")
        }
    }
    
    func clearChat() {
        messages.removeAll()
        sessionId = UUID().uuidString
        errorMessage = ""
        showError = false
    }
    
    // MARK: - Private Methods
    
    private func performRAGSearchForMessage(_ query: String, into result: inout String) async {
        do {
            let searchResults = try await client.searchRAG(query: query, limit: ragLimit)
            let formatted = formatRAGResults(searchResults)
            result += "Based on knowledge base:\n\(formatted)\n\n"
        } catch {
            // Continue without RAG on search failure
            print("RAG search failed: \(error)")
        }
    }
    
    private func formatRAGResults(_ results: [String]) -> String {
        guard !results.isEmpty else {
            return "No relevant documents found."
        }
        
        return results.enumerated()
            .map { "\($0.offset + 1). \($0.element)" }
            .joined(separator: "\n\n")
    }
    
    private func showErrorMessage(_ message: String) {
        errorMessage = message
        showError = true
        
        // Auto-hide after 5 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak self] in
            withAnimation {
                self?.showError = false
            }
        }
    }
}
