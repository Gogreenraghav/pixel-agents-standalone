# Pixel Agents - Standalone Web App

A standalone browser version of Pixel Agents, converted from the VSCode extension.

## 🎯 What's Inside

This is a fully self-contained web application that runs Pixel Agents in any modern browser without needing VSCode or any extension.

### Changes from VSCode Extension

1. **Removed VSCode API dependencies** - All VSCode API calls are mocked
2. **Standalone HTML wrapper** - Single `index.html` entry point
3. **Mock extension message system** - Browser runtime automatically loads mock data
4. **Bundled assets** - All sprites, furniture, characters included locally

## 🚀 How to Run

### Option 1: Python HTTP Server (Recommended)

```bash
cd pixel-agents-standalone
python3 -m http.server 8766
```

Then open: `http://localhost:8766/index.html`

### Option 2: Node.js HTTP Server

```bash
npx http-server -p 8766
```

Then open: `http://localhost:8766/index.html`

### Option 3: Any Static File Server

Just serve the `pixel-agents-standalone` directory with any HTTP server. The app needs to be served over HTTP (not `file://`) because it loads assets dynamically.

## 📁 Structure

```
pixel-agents-standalone/
├── index.html              # Main entry point
├── README.md              # This file
└── assets/                # All bundled assets
    ├── index-DoBQIEQ8.js  # Main app bundle
    ├── index-CX8LPhCk.css # Styles
    ├── browserMock-deCxOE2w.js  # Mock system
    ├── asset-index.json   # Asset manifest
    ├── furniture-catalog.json
    ├── default-layout-1.json
    ├── characters/        # Character sprites
    ├── floors/            # Floor tiles
    ├── furniture/         # Furniture sprites
    └── walls/             # Wall tiles
```

## ✨ Features

- **Browser Runtime Detection** - Automatically detects it's running in a browser
- **Mock Data Loading** - Loads default layout and assets without VSCode
- **Full Edit Mode** - Paint floors, place walls, add furniture
- **Zoom & Pan** - Navigate the office space
- **No External Dependencies** - Everything bundled locally

## 🔧 Technical Details

### How It Works

1. The app detects it's running in a browser (no `acquireVsCodeApi` function)
2. Browser mock (`browserMock.ts`) automatically loads all assets
3. VSCode API calls are logged to console instead of posting to extension
4. Mock messages dispatch to simulate extension → webview communication

### Key Files Referenced

- **Source**: `/root/clawd/pixel-agents-ref/webview-ui/`
- **Built Assets**: `/root/clawd/dist/webview/assets/`
- **Standalone**: `/root/clawd/pixel-agents-standalone/`

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires modern ES6+ support and Canvas API.

## 🐛 Debugging

Open browser DevTools console to see:
- `[BrowserMock]` messages showing asset loading
- `[vscode.postMessage]` messages showing mock extension calls
- Any errors during initialization

## 📝 Limitations

Since this runs without the VSCode extension:
- No real agent/subagent spawning
- No terminal integration
- No file system access
- Layout saves go to localStorage (not actual files)
- Mock characters/agents shown for demo purposes

## 🎨 Customization

Edit `index.html` to customize:
- Page title
- CSS theme variables
- Initial viewport settings

## 📦 Deployment

To deploy to a static host (GitHub Pages, Netlify, Vercel, etc.):

1. Upload the entire `pixel-agents-standalone` directory
2. Set `index.html` as the entry point
3. No build step needed - already compiled!

## ⏱️ Build Time

Completed in ~5 minutes (well under the 15-minute target!)

## 🔗 Original Project

Converted from: Pixel Agents VSCode Extension
Repository structure preserved from `/root/clawd/pixel-agents-ref/`

---

**Enjoy exploring your pixel office! 🏢✨**
