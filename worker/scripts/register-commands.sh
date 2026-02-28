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

# The /report command uses 5 enum dropdowns (string selects) as options.
# After the user picks these, a modal opens for the remaining text fields.
PAYLOAD=$(cat <<'EOF'
{
  "name": "report",
  "type": 1,
  "description": "Submit a XeniOS compatibility report",
  "options": [
    {
      "name": "platform",
      "description": "Platform you tested on",
      "type": 3,
      "required": true,
      "choices": [
        { "name": "iOS / iPadOS", "value": "ios" },
        { "name": "macOS", "value": "macos" }
      ]
    },
    {
      "name": "status",
      "description": "How well does the game work?",
      "type": 3,
      "required": true,
      "choices": [
        { "name": "Playable — works start to finish", "value": "playable" },
        { "name": "In-Game — reaches gameplay with issues", "value": "ingame" },
        { "name": "Intro — gets past loading, crashes before gameplay", "value": "intro" },
        { "name": "Loads — boots/menus but can't reach gameplay", "value": "loads" },
        { "name": "Nothing — won't boot or crashes immediately", "value": "nothing" }
      ]
    },
    {
      "name": "perf",
      "description": "Performance level",
      "type": 3,
      "required": true,
      "choices": [
        { "name": "Great — runs at or near full speed", "value": "great" },
        { "name": "OK — playable with noticeable drops", "value": "ok" },
        { "name": "Poor — significant performance issues", "value": "poor" }
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
      "description": "GPU backend used",
      "type": 3,
      "required": true,
      "choices": [
        { "name": "MSL — Metal Shading Language (all platforms)", "value": "msl" },
        { "name": "MSC — Metal Shader Converter (macOS 15+ only)", "value": "msc" }
      ]
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
