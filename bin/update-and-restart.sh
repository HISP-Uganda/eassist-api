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

echo "[INFO] Step 1: Running database migrations..."
if npm run migrate; then
  echo "[INFO] ✅ Database migrations completed successfully."
else
  echo "[ERROR] ❌ Database migrations failed. Please check the logs."
  exit 1
fi

echo "[INFO] Step 2: Seeding all required data..."
# The 'seed:all' script combines permissions, superuser, and initial data
if npm run seed:all; then
  echo "[INFO] ✅ Database seeding completed successfully."
else
  echo "[ERROR] ❌ Database seeding failed. Please check the logs."
  exit 1
fi

echo "[INFO] Step 3: Restarting the eassist-api service using nohup on port 8080..."

# Forcefully stop any process currently using port 8080
echo "[INFO] Clearing port 8080..."
lsof -ti tcp:8080 | xargs kill -9 || true
sleep 2 # Give the OS a moment to release the port

# Verify the port is free before continuing
for i in $(seq 1 10); do
  if ! lsof -i:8080 >/dev/null; then
    echo "[INFO] ✅ Port 8080 is now free."
    break
  fi
  if [ "$i" -eq 10 ]; then
    echo "[ERROR] ❌ Port 8080 did not become free after cleanup. Aborting."
    exit 1
  fi
  echo "[INFO] Port 8080 is still busy. Retrying... ($i/10)"
  sleep 1
done

# Start the service in the background using nohup
echo "[INFO] Starting service with nohup..."
LOG_FILE="$APP_DIR/logs/eassist-api-restart.log"
mkdir -p "$(dirname "$LOG_FILE")"

nohup npm start > "$LOG_FILE" 2>&1 &
NEW_PID=$!

echo "[INFO] Service started with new PID: $NEW_PID. Log file: $LOG_FILE"

echo "[INFO] Step 4: Verifying service status..."
sleep 5 # Give the service a moment to start up

# Check if the process is running and listening on port 8080
if kill -0 $NEW_PID && lsof -i:8080 -a -p $NEW_PID >/dev/null; then
  echo "[INFO] ✅ Service is active and listening on port 8080."
  echo "[SUCCESS] ✅ All operations completed successfully. The eAssist API has been updated and restarted."
else
  echo "[ERROR] ❌ Service failed to start or is not listening on port 8080."
  echo "[INFO] Displaying recent logs from $LOG_FILE:"
  tail -30 "$LOG_FILE"
  exit 1
fi

exit 0
