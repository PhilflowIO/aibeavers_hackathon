#!/usr/bin/env bash
#
# fetch_data.sh — pull the latest German funding dataset ON DEMAND.
#
# The data is PUBLIC: the CorrelAid open dump of the official German federal funding
# database (foerderdatenbank.de — KfW + BAFA + all Bundesländer + EU), refreshed every
# ~2 days, licensed CC BY-ND 3.0 DE. Nothing is bundled in the repo; this script always
# fetches the current version.
#
# Usage:
#   ./fetch_data.sh            # → ./data/funding_raw.parquet
#   ./fetch_data.sh /tmp/out   # → /tmp/out/funding_raw.parquet
#
set -euo pipefail

URL="https://foerderdatenbankdump.fra1.cdn.digitaloceanspaces.com/data/parquet_data.zip"
DEST_DIR="${1:-./data}"
OUT="$DEST_DIR/funding_raw.parquet"

mkdir -p "$DEST_DIR"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "↓ Fetching public foerderdatenbank.de dump (CorrelAid, CC BY-ND 3.0 DE) ..."
curl -fSL --retry 3 --retry-delay 2 --connect-timeout 30 -o "$tmp/dump.zip" "$URL"
echo "✓ downloaded $(du -h "$tmp/dump.zip" | cut -f1)"

# Extract the parquet member name-agnostically (don't hardcode the inner filename).
member="$(unzip -Z1 "$tmp/dump.zip" | grep -i '\.parquet$' | head -n1)"
[ -n "$member" ] || { echo "✗ no .parquet found inside the archive" >&2; exit 1; }

unzip -o -j "$tmp/dump.zip" "$member" -d "$DEST_DIR" >/dev/null
mv -f "$DEST_DIR/$(basename "$member")" "$OUT"

echo "✓ fresh data → $OUT"
echo "  (re-run any time to refresh; ~2.5k active programmes, updated every ~2 days)"
