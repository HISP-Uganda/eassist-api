#!/usr/bin/env bash
# Wrapper: deploy using eassistctl.sh (default ref: origin/releases)
set -euo pipefail

REF="${1:-origin/releases}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CTL="$SCRIPT_DIR/eassistctl.sh"
chmod +x "$CTL" 2>/dev/null || true

# Default install dir is /opt/eassist-api; override via DEST_DIR env if needed
"$CTL" deploy --dir "${DEST_DIR:-/opt/eassist-api}" --ref "$REF"
