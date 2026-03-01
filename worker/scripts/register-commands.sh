#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Register the /report slash command with Discord.
# Run once (or whenever command options change).
#
# Usage:
#   DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... bash worker/scripts/register-commands.sh
#
# The bot token is NOT the same as the public key. You can find it in
# the Discord Developer Portal → Bot → Token.
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

: "${DISCORD_APP_ID:?Set DISCORD_APP_ID env var}"
: "${DISCORD_BOT_TOKEN:?Set DISCORD_BOT_TOKEN env var}"

API="https://discord.com/api/v10/applications/${DISCORD_APP_ID}/commands"

# Enum fields use `choices` — Discord renders these as native dropdowns.
# After filling all options, user hits enter → modal pops up for text fields
# (Title ID, Game Name, Notes).
PAYLOAD=$(cat <<'EOF'
{
  "name": "report",
  "type": 1,
  "description": "Submit a XeniOS compatibility report",
  "options": [
    {
      "name": "status",
      "description": "How well does the game work?",
      "type": 3,
      "required": true,
      "choices": [
        { "name": "Playable — plays start to finish", "value": "playable" },
        { "name": "In-Game — reaches gameplay, significant issues", "value": "ingame" },
        { "name": "Intro — gets past loading, crashes before gameplay", "value": "intro" },
        { "name": "Loads — shows menus, can't reach gameplay", "value": "loads" },
        { "name": "Nothing — doesn't boot or crashes immediately", "value": "nothing" }
      ]
    },
    {
      "name": "perf",
      "description": "Performance tier (N/A if game doesn't boot)",
      "type": 3,
      "required": true,
      "choices": [
        { "name": "Great — full speed or near it", "value": "great" },
        { "name": "OK — playable with drops", "value": "ok" },
        { "name": "Poor — significant performance issues", "value": "poor" },
        { "name": "N/A — not applicable", "value": "n/a" }
      ]
    },
    {
      "name": "device",
      "description": "Device model (platform is inferred automatically)",
      "type": 3,
      "required": true,
      "choices": [
        { "name": "iPhone 17 Pro Max", "value": "iPhone 17 Pro Max" },
        { "name": "iPhone 17 Pro", "value": "iPhone 17 Pro" },
        { "name": "iPhone 17 Air", "value": "iPhone 17 Air" },
        { "name": "iPhone 17", "value": "iPhone 17" },
        { "name": "iPhone 16 Pro Max", "value": "iPhone 16 Pro Max" },
        { "name": "iPhone 16 Pro", "value": "iPhone 16 Pro" },
        { "name": "iPhone 16 Plus", "value": "iPhone 16 Plus" },
        { "name": "iPhone 16", "value": "iPhone 16" },
        { "name": "iPhone 16e", "value": "iPhone 16e" },
        { "name": "iPhone 15 Pro Max", "value": "iPhone 15 Pro Max" },
        { "name": "iPhone 15 Pro", "value": "iPhone 15 Pro" },
        { "name": "iPad Pro M5", "value": "iPad Pro M5" },
        { "name": "iPad Pro M4", "value": "iPad Pro M4" },
        { "name": "iPad Air M3", "value": "iPad Air M3" },
        { "name": "iPad Air M2", "value": "iPad Air M2" },
        { "name": "iPad mini (A17 Pro)", "value": "iPad mini (A17 Pro)" },
        { "name": "iPad (11th gen)", "value": "iPad (11th gen)" },
        { "name": "MacBook Pro M5", "value": "MacBook Pro M5" },
        { "name": "MacBook Pro M4 Pro", "value": "MacBook Pro M4 Pro" },
        { "name": "MacBook Pro M4 Max", "value": "MacBook Pro M4 Max" },
        { "name": "MacBook Air M4", "value": "MacBook Air M4" },
        { "name": "Other Mac (M1 or older)", "value": "Other Mac (M1 or older)" },
        { "name": "iMac M4", "value": "iMac M4" },
        { "name": "Mac mini M4", "value": "Mac mini M4" },
        { "name": "Mac Studio M4 Max/Ultra", "value": "Mac Studio M4 Max/Ultra" }
      ]
    },
    {
      "name": "os_version",
      "description": "OS version",
      "type": 3,
      "required": true,
      "choices": [
        { "name": "iOS / iPadOS 26.3", "value": "26.3" },
        { "name": "iOS / iPadOS 26.2", "value": "26.2" },
        { "name": "iOS / iPadOS 26.1", "value": "26.1" },
        { "name": "iOS / iPadOS 26.0", "value": "26.0" },
        { "name": "iOS 18.3", "value": "18.3" },
        { "name": "iOS 18.2", "value": "18.2" },
        { "name": "iOS 18.1", "value": "18.1" },
        { "name": "iOS 18.0", "value": "18.0" },
        { "name": "macOS 26.3 Tahoe", "value": "m26.3" },
        { "name": "macOS 26.2 Tahoe", "value": "m26.2" },
        { "name": "macOS 26.1 Tahoe", "value": "m26.1" },
        { "name": "macOS 26.0 Tahoe", "value": "m26.0" },
        { "name": "macOS 15.3 Sequoia", "value": "m15.3" },
        { "name": "macOS 15.2 Sequoia", "value": "m15.2" },
        { "name": "macOS 15.1 Sequoia", "value": "m15.1" },
        { "name": "macOS 15.0 Sequoia", "value": "m15.0" }
      ]
    },
    {
      "name": "arch",
      "description": "CPU architecture",
      "type": 3,
      "required": true,
      "choices": [
        { "name": "ARM64 (Apple Silicon / all iOS)", "value": "arm64" },
        { "name": "x86_64 (Intel Mac)", "value": "x86_64" }
      ]
    },
    {
      "name": "gpu",
      "description": "GPU backend",
      "type": 3,
      "required": true,
      "choices": [
        { "name": "MSL — Metal Shading Language", "value": "msl" },
        { "name": "MSC — Metal Shader Converter (macOS 14+)", "value": "msc" }
      ]
    },
    {
      "name": "screenshot",
      "description": "Attach a screenshot or video (optional)",
      "type": 11,
      "required": false
    }
  ]
}
EOF
)

echo "Registering /report command..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -H "Authorization: Bot ${DISCORD_BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "Success! /report command registered."
  echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Command ID: {d[\"id\"]}')" 2>/dev/null || true
else
  echo "Failed with HTTP $HTTP_CODE:"
  echo "$BODY"
  exit 1
fi

# ── /compat command ──────────────────────────────────────────────────
COMPAT_PAYLOAD=$(cat <<'EOF'
{
  "name": "compat",
  "type": 1,
  "description": "Look up XeniOS game compatibility",
  "options": [
    {
      "name": "game",
      "description": "Search by game title or title ID (leave empty for summary)",
      "type": 3,
      "required": false
    }
  ]
}
EOF
)

echo "Registering /compat command..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -H "Authorization: Bot ${DISCORD_BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$COMPAT_PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "Success! /compat command registered."
  echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Command ID: {d[\"id\"]}')" 2>/dev/null || true
else
  echo "Failed with HTTP $HTTP_CODE:"
  echo "$BODY"
  exit 1
fi

# ── /support command ─────────────────────────────────────────────────
SUPPORT_PAYLOAD=$(cat <<'EOF'
{
  "name": "support",
  "type": 1,
  "description": "Show how to support XeniOS development"
}
EOF
)

echo "Registering /support command..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -H "Authorization: Bot ${DISCORD_BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$SUPPORT_PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "Success! /support command registered."
  echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Command ID: {d[\"id\"]}')" 2>/dev/null || true
else
  echo "Failed with HTTP $HTTP_CODE:"
  echo "$BODY"
  exit 1
fi
