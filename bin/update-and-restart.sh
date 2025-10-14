#!/usr/bin/env bash
#
# This script updates the database with the latest migrations and seed data,
# then restarts the application service using nohup.
#
set -euo pipefail

# Ensure the script is run from the application directory
cd "$(dirname "$0")/.."
APP_DIR=$(pwd)
echo "[INFO] Running in directory: $APP_DIR"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CTL="$SCRIPT_DIR/eassistctl.sh"
chmod +x "$CTL" 2>/dev/null || true

REF="${1:-origin/releases}"

"$CTL" deploy --dir "${DEST_DIR:-/opt/eassist-api}" --ref "$REF"

exit 0
