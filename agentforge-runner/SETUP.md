# AgentForge Runner - Build Instructions

This guide walks you through building the native desktop app.

## Quick Start (Development)

### 1. Install System Dependencies

**macOS:**
```bash
xcode-select --install
```

**Windows:**
- Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### 2. Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 3. Install Node.js Dependencies
```bash
cd agentforge-runner
npm install
```

### 4. Install Python Dependencies
```bash
cd src-tauri/resources/python
pip install -r requirements.txt
```

### 5. Run in Development Mode
```bash
npm run tauri:dev
```

## Building for Production

### macOS
```bash
npm run tauri:build -- --bundles dmg
# Output: src-tauri/target/release/bundle/dmg/AgentForge Runner.dmg
```

### Windows
```bash
npm run tauri:build -- --bundles msi
# Output: src-tauri/target/release/bundle/msi/AgentForge Runner.msi
```

### Linux
```bash
npm run tauri:build -- --bundles appimage
# Output: src-tauri/target/release/bundle/appimage/AgentForge Runner.AppImage
```

## Code Signing (Optional but Recommended)

### macOS
1. Get an Apple Developer account ($99/year)
2. Create a Developer ID Application certificate
3. Set environment variables:
   ```bash
   export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
   npm run tauri:build -- --bundles dmg
   ```

### Windows
1. Get a code signing certificate from a trusted CA
2. Use `signtool` to sign the MSI

## Testing the Build

1. Build the app
2. Install it on a clean machine
3. Test double-clicking a `.agentforge` file
4. Verify Python backend starts silently
5. Test chat functionality with Ollama

## Troubleshooting

### "Python not found"
- Ensure Python 3.8+ is installed and in PATH
- On Windows, check "Add Python to PATH" during installation

### "Ollama not connected"
- Run `ollama serve` in a terminal
- Pull a model: `ollama pull llama3.2`

### "WebView2 not found" (Windows)
- Download and install WebView2 from Microsoft

### Build fails on Linux
- Install all GTK and WebKit dependencies listed above
