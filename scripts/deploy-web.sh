#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-root@finance.philflow.io}"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)"
REMOTE_ROOT="/opt/finance-web"
REMOTE_RELEASE="${REMOTE_ROOT}/releases/${RELEASE_ID}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH_OPTS=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new)

echo "→ Sync release ${RELEASE_ID} to ${HOST}"
ssh "${SSH_OPTS[@]}" "$HOST" "mkdir -p '${REMOTE_RELEASE}'"

rsync -az --delete -e "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new" \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .playwright-mcp \
  --exclude 'ui-readability-*.png' \
  --exclude Fördermittel \
  --exclude .env \
  "${REPO_ROOT}/" "${HOST}:${REMOTE_RELEASE}/"

echo "→ Build finance-web:latest on server"
ssh "${SSH_OPTS[@]}" "$HOST" bash -s <<EOF
set -euo pipefail
cd '${REMOTE_RELEASE}'
docker build -f Dockerfile.web -t finance-web:latest .
ln -sfn '${REMOTE_RELEASE}' '${REMOTE_ROOT}/current'
cd /opt/nacharbeit
docker compose up -d web
docker compose restart caddy
EOF

echo "→ Done. Preview: https://finance.philflow.io/"
