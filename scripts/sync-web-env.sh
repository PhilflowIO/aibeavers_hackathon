#!/usr/bin/env bash
# Push web.env to Hetzner from local .env (+ optional PIPEDRIVE_ENV_FILE).
set -euo pipefail

HOST="${DEPLOY_HOST:-root@finance.philflow.io}"
SSH_OPTS=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Optional second file when Pipedrive lives outside repo .env
export PIPEDRIVE_ENV_FILE="${PIPEDRIVE_ENV_FILE:-${HOME}/Documents/personal_agent/hackathon-ai.beavers/.env}"

echo "→ Building web.env (Baikal + Pipedrive from local creds, not Radicale demo)"
WEB_ENV="$(node "${REPO_ROOT}/scripts/sync-web-env.mjs")"

ssh "${SSH_OPTS[@]}" "$HOST" "cat > /opt/nacharbeit/web.env" <<<"$WEB_ENV"

echo "→ Restart nacharbeit-web"
ssh "${SSH_OPTS[@]}" "$HOST" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/nacharbeit
docker compose up -d web
docker compose restart caddy
REMOTE

echo "→ web.env synced. Keys present:"
ssh "${SSH_OPTS[@]}" "$HOST" "grep -E '^[A-Z_]+=' /opt/nacharbeit/web.env | cut -d= -f1 | sort"
