#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

VITE_PORT=1420
HMR_PORT=1421
RELEASE_DIR="$ROOT/release"

log() { printf '▸ %s\n' "$*"; }
die() { printf '✗ %s\n' "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null || true)
  [[ -z "$pids" ]] || kill -9 $pids 2>/dev/null || true
}

log "Checking toolchain…"
need_cmd node
need_cmd npm
need_cmd cargo

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[[ "$NODE_MAJOR" -ge 18 ]] || die "Node.js 18+ required (found $(node -v))"

log "Installing JS dependencies…"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

log "Freeing dev ports…"
kill_port "$VITE_PORT"
kill_port "$HMR_PORT"

TAURI_ARGS=()
if [[ "$(uname -s)" == "Darwin" ]]; then
  if rustup target list --installed | grep -q "universal-apple-darwin"; then
    TAURI_ARGS=(--target universal-apple-darwin)
    log "Building universal macOS binary (Intel + Apple Silicon)…"
  else
    log "Building for native macOS arch ($(uname -m))…"
    log "Tip: rustup target add aarch64-apple-darwin x86_64-apple-darwin && rustup target add universal-apple-darwin"
  fi
fi

log "Running production build…"
npm run tauri build -- "${TAURI_ARGS[@]}"

mkdir -p "$RELEASE_DIR"
shopt -s nullglob

if [[ "$(uname -s)" == "Darwin" ]]; then
  for f in src-tauri/target/release/bundle/dmg/*.dmg; do
    cp -f "$f" "$RELEASE_DIR/"
    log "DMG → $RELEASE_DIR/$(basename "$f")"
  done
  for app in src-tauri/target/release/bundle/macos/*.app; do
    log "App bundle → $app"
  done
  [[ $(ls -1 "$RELEASE_DIR"/*.dmg 2>/dev/null | wc -l) -gt 0 ]] || die "No .dmg found under src-tauri/target/release/bundle/dmg/"
elif [[ "$(uname -s)" == "MINGW"* || "$(uname -s)" == "MSYS"* || -n "${WINDIR:-}" ]]; then
  die "On Windows use: .\\build_release.ps1"
else
  for f in src-tauri/target/release/bundle/deb/*.deb src-tauri/target/release/bundle/appimage/*.AppImage; do
    cp -f "$f" "$RELEASE_DIR/"
    log "Package → $RELEASE_DIR/$(basename "$f")"
  done
fi

log "Done. Installers in: $RELEASE_DIR"
