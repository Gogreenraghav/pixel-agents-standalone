#!/bin/bash
# Launch Pixel Agents Standalone Web App

PORT=8766
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🎮 Pixel Agents - Standalone Web App"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📂 Directory: $DIR"
echo "🌐 Starting HTTP server on port $PORT..."
echo ""

cd "$DIR"

# Try python3 first, then python, then node
if command -v python3 &> /dev/null; then
    echo "✓ Using Python 3"
    echo ""
    echo "🚀 Open in browser: http://localhost:$PORT/index.html"
    echo "🛑 Press Ctrl+C to stop"
    echo ""
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    echo "✓ Using Python"
    echo ""
    echo "🚀 Open in browser: http://localhost:$PORT/index.html"
    echo "🛑 Press Ctrl+C to stop"
    echo ""
    python -m SimpleHTTPServer $PORT
elif command -v npx &> /dev/null; then
    echo "✓ Using Node.js (npx http-server)"
    echo ""
    echo "🚀 Open in browser: http://localhost:$PORT/index.html"
    echo "🛑 Press Ctrl+C to stop"
    echo ""
    npx http-server -p $PORT
else
    echo "❌ Error: No HTTP server found!"
    echo ""
    echo "Please install one of:"
    echo "  - Python 3: apt install python3"
    echo "  - Node.js: apt install nodejs npm"
    echo ""
    exit 1
fi
