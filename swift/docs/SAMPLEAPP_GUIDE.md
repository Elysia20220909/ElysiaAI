# SwiftUI Sample App Guide

## Overview

ElysiaAISampleApp is a fully-featured iOS/macOS chat application demonstrating:
- Real-time streaming chat with ElysiaAI server
- RAG (Retrieval-Augmented Generation) search integration
- Responsive UI with SwiftUI
- Error handling and connection monitoring
- Session management

## Architecture

### Components

1. **ContentView.swift**
   - Main UI layout (header, message list, input area)
   - Scrolling message display
   - Message composition interface
   - RAG options toggle

2. **ChatViewModel.swift**
   - State management using `@Published` properties
   - ElysiaAI client initialization
   - Message sending with streaming
   - RAG search handling
   - Error management

3. **ElysiaAISampleApp.swift**
   - App entry point
   - Scene management
   - Lifecycle handling

## Features

### Chat Interface
- **Message bubbles**: User (blue, right) vs Assistant (gray, left)
- **Timestamps**: Show when each message was sent
- **Auto-scroll**: Scrolls to latest message automatically
- **Empty state**: Welcome message before first conversation

### RAG Search
- Optional knowledge base search per message
- Configurable result limit (1-50 documents)
- Search results formatted in assistant response
- Toggle on/off as needed

### Status Management
- Real-time connection status (Connected/Degraded/Disconnected)
- Health check on app launch
- Server status monitoring via menu
- Error notifications with auto-dismiss

### Input Handling
- Send on Enter key
- Text field focus management
- Disabled send button while loading
- Session ID tracking
- User ID via device identifier

## Usage

### Basic Chat
1. Launch app
2. Type message in text field
3. Tap send button or press Enter
4. Stream response displays automatically

### RAG Search
1. Tap menu button (•••)
2. Select "Show RAG Options"
3. Toggle "Use RAG Search"
4. Adjust result limit (1-50)
5. Send message - includes knowledge base context

### Server Status
1. Tap menu button (•••)
2. Select "Check Server"
3. Status updates in header

### Clear Chat
1. Tap menu button (•••)
2. Select "Clear Chat"
3. New session starts automatically

## Customization

### Change Server URL
```swift
let chatView = ContentView()
// In ChatViewModel.init, modify:
self.client = ElysiaClient(serverURL: URL(string: "http://your-server:3000")!)
```

### Styling
Edit `ContentView.swift`:
- Color scheme: Modify `.blue` to preferred color
- Font sizes: Adjust `.font()` modifiers
- Spacing: Update `spacing:` parameters

### Error Display Duration
In `ChatViewModel.showErrorMessage()`:
```swift
DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) // Change 5.0 to desired seconds
```

## Building

### Prerequisites
- Xcode 15.0+
- iOS 16+ or macOS 13+
- Swift 6.2.1+

### Build Steps
```bash
# Debug build
swift build

# Release build
swift build -c release

# Run tests
swift test
```

### Windows Build
See [Windows Build Guide](../scripts/build-windows.ps1)

## Testing

### Run Unit Tests
```bash
swift test
```

### Manual Testing Checklist
- [ ] App launches and shows welcome screen
- [ ] Health check works (server online/offline)
- [ ] Can send basic message and receive response
- [ ] Streaming displays text progressively
- [ ] RAG search toggles on/off
- [ ] RAG results display correctly
- [ ] Error messages show and auto-dismiss
- [ ] Clear chat resets session
- [ ] Multiple messages maintain conversation context
- [ ] Timestamp displays correctly

## Architecture Pattern

### MVVM (Model-View-ViewModel)
```
View (ContentView)
  ↓
ViewModel (ChatViewModel)
  ↓
Model (ChatMessage, ElysiaClient)
```

### Data Flow
1. User types message → `inputText` updated
2. Tap send → `sendMessage()` called
3. ViewModel uses `ElysiaClient` to stream response
4. Chunks appended to `assistantResponse`
5. Complete response added to `messages` array
6. View observes `@Published messages` and updates

## Error Handling

Common errors and handling:

| Error | Cause | Recovery |
|-------|-------|----------|
| Server Unavailable | Server not running | Check health status |
| Timeout | Network slow | Increase timeout in ChatViewModel |
| Invalid Response | Server error | Check server logs |
| Network Error | No internet | Check connection |

## Performance Tips

- Messages list uses `ForEach` with IDs for efficient updates
- Lazy loading via scroll container
- Debounce rapid send attempts via `isLoading` flag
- Session reuse reduces connection overhead

## Known Limitations

- Single session per app instance
- No message persistence (in-memory only)
- No attachment support
- No audio/voice features (planned)

## Future Enhancements

- [ ] Message persistence with local database
- [ ] Message editing/deletion
- [ ] Image attachments
- [ ] Voice input/output
- [ ] Conversation history browsing
- [ ] Theme customization (dark/light mode)
- [ ] Multi-session support
- [ ] Export chat history
