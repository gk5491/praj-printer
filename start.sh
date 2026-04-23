#!/usr/bin/env bash
set -e

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting Print API on http://localhost:3001"
node server/index.js &
API_PID=$!

cleanup() {
  echo "Shutting down..."
  kill $API_PID 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "Starting frontend on http://localhost:5000"
npm run dev

cleanup
