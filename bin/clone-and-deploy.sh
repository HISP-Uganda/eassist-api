#!/usr/bin/env bash
# Clone or update the eassist-api repo into a target directory and deploy
# Usage:
#   ./bin/clone-and-deploy.sh [target_dir] [git_ref] [git_url]
# Defaults:
#   target_dir: /opt/eassist-api
#   git_ref: origin/releases
#   git_url: https://github.com/HISP-Uganda/eassist-api.git
set -euo pipefail

TARGET_DIR="${1:-/opt/eassist-api}"
GIT_REF="${2:-origin/releases}"
GIT_URL="${3:-https://github.com/HISP-Uganda/eassist-api.git}"

mkdir -p "$(dirname "$TARGET_DIR")"

if [ -d "$TARGET_DIR/.git" ]; then
  echo "[INFO] Existing repo detected at $TARGET_DIR"
  cd "$TARGET_DIR"
  git remote set-url origin "$GIT_URL" || true
  git fetch --all --prune --tags
else
  echo "[INFO] Cloning $GIT_URL into $TARGET_DIR"
  git clone "$GIT_URL" "$TARGET_DIR"
  cd "$TARGET_DIR"
fi

echo "[INFO] Deploying ref: $GIT_REF"
# Ensure deploy script is executable
chmod +x ./bin/deploy.sh || true

# Run deploy; it will handle checkout/reset, dependencies, migrations, and restart on 8080
./bin/deploy.sh "$GIT_REF"

echo "[OK] Done. Service should be running on port 8080."
