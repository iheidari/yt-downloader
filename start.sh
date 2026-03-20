#!/bin/bash

echo "🚀 Starting Video Downloader Application..."

# Check if yt-dlp is installed
if ! command -v yt-dlp &> /dev/null; then
    echo "❌ Error: yt-dlp is not installed"
    echo "Please install it first:"
    echo "  macOS: brew install yt-dlp"
    echo "  Linux: sudo apt install yt-dlp"
    echo "  Or download from: https://github.com/yt-dlp/yt-dlp/releases"
    exit 1
fi

echo "✅ yt-dlp found: $(yt-dlp --version)"

# Create downloads directory if it doesn't exist
mkdir -p backend/downloads

# Start backend
echo "🌐 Starting backend server on port 3001..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend started successfully
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Backend failed to start"
    exit 1
fi

echo "✅ Backend is running!"

# Start frontend
echo "🎨 Starting frontend on port 5173..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Wait for frontend
sleep 3

echo ""
echo "✨ Application is ready!"
echo "🌐 Frontend: http://localhost:5173"
echo "🔌 Backend API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT

wait
