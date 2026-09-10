#!/usr/bin/env bash
# Manually test Alpaca market-data websocket auth, independent of the app.
#
# Reads ALPACA_API_KEY / ALPACA_API_SECRET from the repo-root .env and opens
# a raw websocket to Alpaca's stock data stream with websocat, sending an
# auth message and printing whatever comes back.
#
# Usage: ./scripts/test_alpaca_ws_auth.sh [iex|sip]
#   feed defaults to "iex" (the free-tier feed; matches this app's default
#   in AlpacaStockDataStream). "sip" requires an Alpaca subscription.
#
# NOTE: this deliberately does NOT set the `Content-Type: application/msgpack`
# header that alpaca-py's client sends - Alpaca defaults to JSON framing
# without it, which is what makes this readable in a terminal.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
FEED="${1:-iex}"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Couldn't find .env at $ENV_FILE" >&2
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${ALPACA_API_KEY:-}" || -z "${ALPACA_API_SECRET:-}" ]]; then
    echo "ALPACA_API_KEY / ALPACA_API_SECRET not set in $ENV_FILE" >&2
    exit 1
fi

if ! command -v websocat >/dev/null 2>&1; then
    echo "websocat not found on PATH" >&2
    exit 1
fi

URL="wss://stream.data.alpaca.markets/v2/${FEED}"
AUTH_MSG=$(printf '{"action":"auth","key":"%s","secret":"%s"}' "$ALPACA_API_KEY" "$ALPACA_API_SECRET")

echo "Connecting to $URL ..." >&2

# Give the server a moment to send its initial "connected" message before we
# send auth, then keep stdin open a few seconds so websocat has time to
# print the auth response before it sees EOF and exits.
timeout 10 bash -c '
    sleep 1
    echo "$1"
    sleep 3
' _ "$AUTH_MSG" | websocat "$URL"
