import Foundation
import ElysiaAI

/// Elysia AI CLI Tool
/// コマンドラインからElysiaちゃんとチャット♡

@main
struct ElysiaAICLI {
    static func main() async {
        print("""
        
        🌸 ฅ(՞៸៸> ᗜ <៸៸՞)ฅ Elysia AI CLI ♡
        ====================================
        
        """)
        
        let config = ElysiaClient.Configuration(
            baseURL: ProcessInfo.processInfo.environment["ELYSIA_URL"] ?? "http://localhost:3000"
        )
        
        let client = ElysiaClient(configuration: config)
        
        // ヘルスチェック
        do {
            let healthy = try await client.healthCheck()
            if healthy {
                print("✅ Server is healthy!\n")
            } else {
                print("⚠️  Server responded but may not be ready\n")
            }
        } catch {
            print("❌ Cannot connect to server: \(error)\n")
            print("Make sure the Elysia server is running at \(config.baseURL)")
            return
        }
        
        // チャット履歴
        var chatHistory: [ElysiaClient.Message] = []
        
        print("Type your message (or 'exit' to quit):\n")
        
        while true {
            print("You: ", terminator: "")
            guard let input = readLine(), !input.isEmpty else {
                continue
            }
            
            if input.lowercased() == "exit" {
                print("\n👋 Bye bye! See you again ♡\n")
                break
            }
            
            // メッセージ追加
            let userMessage = ElysiaClient.Message(role: "user", content: input)
            chatHistory.append(userMessage)
            
            print("\nElysia: ", terminator: "")
            
            do {
                var assistantResponse = ""
                let stream = try await client.sendMessage(messages: chatHistory)
                
                for try await chunk in stream {
                    print(chunk, terminator: "")
                    fflush(stdout)
                    assistantResponse += chunk
                }
                
                print("\n")
                
                // アシスタントメッセージを履歴に追加
                let assistantMessage = ElysiaClient.Message(
                    role: "assistant",
                    content: assistantResponse
                )
                chatHistory.append(assistantMessage)
                
            } catch {
                print("\n❌ Error: \(error)\n")
            }
        }
    }
}
