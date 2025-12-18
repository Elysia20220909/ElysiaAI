import SwiftUI

@main
struct ElysiaAISampleApp: App {
    @Environment(\.scenePhase) var scenePhase
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            switch newPhase {
            case .active:
                print("App moved to foreground")
            case .inactive:
                print("App moved to background")
            case .background:
                print("App in background")
            @unknown default:
                break
            }
        }
    }
}
