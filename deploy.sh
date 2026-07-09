#!/bin/bash
# Deploy script for eagle-amsterdam, meant to be triggered over SSH by the
# GitHub Actions workflow on push to main. Runs as the `deploy` user.
set -euo pipefail

APP_DIR="/opt/apps/eagle-amsterdam"
cd "$APP_DIR"

echo "==> git pull"
git pull --ff-only origin main

echo "==> npm install"
npm install

echo "==> docker compose build + up"
set -a
source .env
set +a
docker compose up -d --build

echo "==> pruning dangling images"
docker image prune -f >/dev/null

echo "==> deploy done: $(date -Iseconds)"
