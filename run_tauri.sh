#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

VITE_PORT=1420
HMR_PORT=1421

log() { printf '▸ %s\n' "$*"; }
die() { printf '✗ %s\n' "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    log "Killing process(es) on port $port: $pids"
    kill -9 $pids 2>/dev/null || true
    sleep 0.3
  fi
}

kill_stale_dev() {
  pkill -f "vite.*$ROOT" 2>/dev/null || true
  pkill -f "cargo run.*meme-generator" 2>/dev/null || true
  pkill -f "target/debug/meme-generator" 2>/dev/null || true
}

log "Checking toolchain…"
need_cmd node
need_cmd npm
need_cmd cargo
need_cmd lsof

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[[ "$NODE_MAJOR" -ge 18 ]] || die "Node.js 18+ required (found $(node -v))"

log "Installing JS dependencies…"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

log "Freeing dev ports ($VITE_PORT, $HMR_PORT)…"
kill_stale_dev
kill_port "$VITE_PORT"
kill_port "$HMR_PORT"

mkdir -p "$HOME/Downloads/meme-output/images"

log "Starting Tauri dev (http://localhost:$VITE_PORT)…"
exec npm run tauri dev
