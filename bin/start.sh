#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CTL="$SCRIPT_DIR/eassistctl.sh"
chmod +x "$CTL" 2>/dev/null || true

"$CTL" start --dir "${DEST_DIR:-/opt/eassist-api}" --port "${PORT:-8080}"
