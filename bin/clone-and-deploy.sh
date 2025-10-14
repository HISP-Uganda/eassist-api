#!/usr/bin/env bash
# Wrapper: clone and deploy using eassistctl.sh
set -euo pipefail

# Back-compat args: [target_dir] [git_ref] [git_url]
TARGET_DIR="${1:-/opt/eassist-api}"
GIT_REF="${2:-origin/releases}"
GIT_URL="${3:-https://github.com/HISP-Uganda/eassist-api.git}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CTL="$SCRIPT_DIR/eassistctl.sh"
chmod +x "$CTL" 2>/dev/null || true

"$CTL" clone --dir "$TARGET_DIR" --repo "$GIT_URL" --ref "$GIT_REF"
"$CTL" deploy --dir "$TARGET_DIR" --repo "$GIT_URL" --ref "$GIT_REF"

echo "[OK] Done. Service should be running on port ${PORT:-8080}."
