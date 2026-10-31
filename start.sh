#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d frontend/dist ] && command -v npm >/dev/null 2>&1; then
  echo "Building frontend..."
  (cd frontend && npm run build >/dev/null 2>&1) || {
    echo "Frontend build failed. Run 'cd frontend && npm run build' to see the error."
    exit 1
  }
fi

if ! curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
  nohup .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/shawty-backend.log 2>&1 &
  echo $! > /tmp/shawty-backend.pid
  sleep 2
fi

if ! curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
  echo "Backend failed to start. See /tmp/shawty-backend.log"
  exit 1
fi

if [ -f /tmp/shawty-tunnel.pid ] && kill -0 "$(cat /tmp/shawty-tunnel.pid)" 2>/dev/null; then
  echo "Tunnel already running."
else
  : > /tmp/shawty-tunnel.log
  nohup cloudflared tunnel --url http://127.0.0.1:8000 --no-autoupdate > /tmp/shawty-tunnel.log 2>&1 &
  echo $! > /tmp/shawty-tunnel.pid
fi

url=""
for _ in $(seq 1 60); do
  url=$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/shawty-tunnel.log 2>/dev/null | head -1 || true)
  [ -n "$url" ] && break
  sleep 1
done

if [ -z "$url" ]; then
  echo "Could not start the public tunnel. See /tmp/shawty-tunnel.log"
  exit 1
fi

echo "$url" > /tmp/shawty-public-url.txt

ready=""
for _ in $(seq 1 60); do
  if curl -sf -m 5 "$url/health" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done

echo "Local UI: http://127.0.0.1:8000/ui/"
if [ -n "$ready" ]; then
  echo "Public UI: $url/ui/"
  echo "API docs:  $url/docs"
  echo "Saved URL: /tmp/shawty-public-url.txt"
else
  echo "Public URL assigned but not reachable yet: $url"
  echo "It usually becomes reachable within a minute. Check /tmp/shawty-tunnel.log"
  exit 1
fi
