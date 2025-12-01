# Elysia AI Mobile

React Native + Expo app for iOS and Android.

## Setup

```bash
cd mobile
npm install
# or
bun install
```

## Development

1. **Start the Elysia server on your computer:**
   ```bash
   # From the root directory
   ./scripts/dev.ps1  # Windows
   # or
   ./scripts/dev.sh   # Linux/macOS
   ```

2. **Find your computer's local IP address:**
   - Windows: `ipconfig` → look for IPv4 Address
   - macOS/Linux: `ifconfig` or `ip addr` → look for inet address
   - Example: `192.168.1.100`

3. **Update the API URL in the app:**
   - Launch the app
   - Tap the ⚙️ settings icon
   - Enter your server URL: `http://YOUR_IP:3000`
   - Tap "Save & Close"

4. **Start the mobile app:**
   ```bash
   npm start
   # or
   bun start
   ```

5. **Run on your device:**
   - **iOS:** Press `i` or scan QR code with Expo Go app
   - **Android:** Press `a` or scan QR code with Expo Go app
   - **Physical Device:** Install [Expo Go](https://expo.dev/client) and scan the QR code

## Build for Production

### iOS (requires macOS + Xcode)
```bash
npm run ios
```

### Android
```bash
npm run android
```

## Notes

- The app connects to your Elysia server via WiFi
- Make sure your phone and computer are on the same network
- The default API URL is `http://192.168.1.100:3000` (update in settings)
- For production builds, consider using [EAS Build](https://docs.expo.dev/build/introduction/)

## Features

- 💬 Real-time streaming chat with Elysia AI
- 🎨 Pink gradient UI matching Elysia's theme
- ⚙️ Configurable server URL
- 📱 Works on iOS and Android
- 🔄 Message history within session
