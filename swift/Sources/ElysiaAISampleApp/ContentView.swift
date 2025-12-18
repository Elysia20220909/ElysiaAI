import SwiftUI

/// Chat message model for display
struct ChatMessage: Identifiable {
    let id = UUID()
    let content: String
    let isUser: Bool
    let timestamp: Date = Date()
}

/// Main chat view
struct ContentView: View {
    @StateObject var chatViewModel = ChatViewModel()
    @FocusState private var isMessageFocused: Bool
    
    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("ElysiaAI Chat")
                            .font(.system(.headline, design: .rounded))
                            .fontWeight(.bold)
                        Text(chatViewModel.connectionStatus)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Menu {
                        Button(action: { chatViewModel.clearChat() }) {
                            Label("Clear Chat", systemImage: "trash")
                        }
                        Button(action: { chatViewModel.checkHealth() }) {
                            Label("Check Server", systemImage: "network")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.system(size: 20))
                            .foregroundColor(.blue)
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                .border(Color(.separator), width: 1)
                
                // Messages
                if chatViewModel.messages.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "bubble.left.and.bubble.right")
                            .font(.system(size: 48))
                            .foregroundColor(.gray)
                        Text("Welcome to ElysiaAI")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("Start a conversation or try RAG search")
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxHeight: .infinity)
                    .padding()
                } else {
                    ScrollViewReader { proxy in
                        ScrollView {
                            VStack(alignment: .leading, spacing: 12) {
                                ForEach(chatViewModel.messages) { message in
                                    ChatBubble(message: message)
                                        .id(message.id)
                                }
                                
                                if chatViewModel.isLoading {
                                    HStack {
                                        ProgressView()
                                            .scaleEffect(0.8)
                                        Text("Thinking...")
                                            .foregroundColor(.secondary)
                                            .font(.caption)
                                        Spacer()
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                }
                            }
                            .padding()
                        }
                        .onChange(of: chatViewModel.messages.count) { _ in
                            withAnimation {
                                proxy.scrollTo(chatViewModel.messages.last?.id)
                            }
                        }
                    }
                }
                
                Divider()
                
                // Input area
                VStack(spacing: 0) {
                    // RAG Search toggle
                    if chatViewModel.showRAGOptions {
                        HStack(spacing: 12) {
                            Toggle("Use RAG Search", isOn: $chatViewModel.useRAGSearch)
                                .font(.caption)
                            
                            if chatViewModel.useRAGSearch {
                                Stepper("Limit: \(chatViewModel.ragLimit)",
                                       value: $chatViewModel.ragLimit, in: 1...50)
                                    .font(.caption)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(.systemGray6))
                        .border(Color(.separator), width: 1)
                    }
                    
                    HStack(spacing: 8) {
                        TextField("Message...", text: $chatViewModel.inputText)
                            .focused($isMessageFocused)
                            .textFieldStyle(.roundedBorder)
                            .onSubmit {
                                Task {
                                    await chatViewModel.sendMessage()
                                    isMessageFocused = true
                                }
                            }
                        
                        Button(action: {
                            Task {
                                await chatViewModel.sendMessage()
                            }
                        }) {
                            Image(systemName: "paperplane.fill")
                                .foregroundColor(.white)
                                .frame(width: 36, height: 36)
                                .background(Circle().fill(Color.blue))
                        }
                        .disabled(chatViewModel.inputText.trimmingCharacters(in: .whitespaces).isEmpty || chatViewModel.isLoading)
                        
                        Menu {
                            Button(action: {
                                chatViewModel.showRAGOptions.toggle()
                            }) {
                                Label(chatViewModel.showRAGOptions ? "Hide RAG Options" : "Show RAG Options",
                                     systemImage: "gearshape")
                            }
                            
                            if chatViewModel.useRAGSearch {
                                Button(action: {
                                    Task {
                                        await chatViewModel.performRAGSearch()
                                    }
                                }) {
                                    Label("Search Knowledge Base", systemImage: "magnifyingglass")
                                }
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                                .font(.system(size: 18))
                        }
                    }
                    .padding()
                }
            }
            
            if chatViewModel.showError {
                VStack {
                    HStack {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Error")
                                .fontWeight(.bold)
                            Text(chatViewModel.errorMessage)
                                .font(.caption)
                                .lineLimit(2)
                        }
                        
                        Spacer()
                        
                        Button(action: { chatViewModel.showError = false }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.gray)
                        }
                    }
                    .padding()
                    .background(Color(.systemRed).opacity(0.1))
                    .cornerRadius(8)
                    .padding()
                    
                    Spacer()
                }
            }
        }
        .onAppear {
            Task {
                await chatViewModel.checkHealth()
            }
        }
    }
}

/// Chat bubble component
struct ChatBubble: View {
    let message: ChatMessage
    
    var body: some View {
        HStack {
            if message.isUser {
                Spacer()
            }
            
            VStack(alignment: message.isUser ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(message.isUser ? Color.blue : Color(.systemGray6))
                    .foregroundColor(message.isUser ? .white : .primary)
                    .cornerRadius(12)
                
                Text(message.timestamp.formatted(date: .omitted, time: .shortened))
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 4)
            }
            
            if !message.isUser {
                Spacer()
            }
        }
    }
}

#if DEBUG
#Preview {
    ContentView()
}
#endif
