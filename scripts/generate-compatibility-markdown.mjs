import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const statusEmoji = {
  playable: "🟢",
  ingame: "🔵",
  intro: "🟡",
  loads: "🟠",
  nothing: "🔴",
};

const statusLabel = {
  playable: "Playable",
  ingame: "In-Game",
  intro: "Intro",
  loads: "Loads",
  nothing: "Doesn't Boot",
};

const perfLabel = {
  great: "🚀 Great",
  ok: "👌 OK",
  poor: "🐢 Poor",
  "n/a": "➖ N/A",
};

const platformLabel = {
  ios: "📱 iOS",
  macos: "🖥️ macOS",
};

const statusOrder = ["playable", "ingame", "intro", "loads", "nothing"];

async function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

function buildMarkdown(games, deviceNames) {
  const sorted = [...games].sort((left, right) => {
    const statusDelta = statusOrder.indexOf(left.status) - statusOrder.indexOf(right.status);
    if (statusDelta !== 0) return statusDelta;
    return left.title.localeCompare(right.title);
  });

  const total = games.length;
  const counts = Object.fromEntries(statusOrder.map((status) => [status, 0]));
  for (const game of games) {
    counts[game.status] += 1;
  }

  const platformCounts = { ios: 0, macos: 0 };
  for (const game of games) {
    for (const platform of game.platforms || []) {
      if (platform in platformCounts) {
        platformCounts[platform] += 1;
      }
    }
  }

  const statsLine = statusOrder
    .map((status) => `${statusEmoji[status]} ${statusLabel[status]}: **${counts[status]}**`)
    .join(" · ");

  const platformLine = Object.entries(platformCounts)
    .filter(([, count]) => count > 0)
    .map(([platform, count]) => `${platformLabel[platform]}: **${count}**`)
    .join(" · ");

  const deviceNameFor = (raw) => deviceNames[raw] || raw;

  const rows = sorted
    .map((game) => {
      const platforms = (game.platforms || []).map((platform) => platformLabel[platform] || platform).join(", ");
      return `| ${statusEmoji[game.status]} | ${game.title} | \`${game.titleId}\` | ${platforms} | ${statusLabel[game.status]} | ${perfLabel[game.perf]} | ${deviceNameFor(game.lastReport.device)} | ${game.updatedAt} |`;
    })
    .join("\n");

  return [
    "# XeniOS Compatibility List",
    "",
    `> **${total} games tested** — auto-generated from [\`data/compatibility.json\`](data/compatibility.json)`,
    ">",
    `> ${statsLine}`,
    ">",
    `> ${platformLine}`,
    "",
    "## Legend",
    "",
    "| Emoji | Status | Description |",
    "|-------|--------|-------------|",
    "| 🟢 | Playable | Game can be played start to finish with minor issues |",
    "| 🔵 | In-Game | Reaches gameplay but has significant issues |",
    "| 🟡 | Intro | Gets past loading but crashes before/during gameplay |",
    "| 🟠 | Loads | Boots and shows menus but can't reach gameplay |",
    "| 🔴 | Doesn't Boot | Does not boot or crashes immediately |",
    "",
    "## Games",
    "",
    "| | Title | Title ID | Platform | Status | Perf | Last Device | Updated |",
    "|-|-------|----------|----------|--------|------|-------------|---------|",
    rows,
    "",
    "---",
    "",
    "*Updated automatically when compatibility data changes. Visit [xenios.jp/compatibility](https://xenios.jp/compatibility) for the full interactive list.*",
    "",
  ].join("\n");
}

async function main() {
  const [games, deviceNames] = await Promise.all([
    readJson("data/compatibility.json"),
    readJson("data/device-names.json"),
  ]);

  const markdown = buildMarkdown(games, deviceNames);
  await fs.writeFile(path.join(repoRoot, "COMPATIBILITY.md"), `${markdown}\n`, "utf8");
  console.log(`Generated COMPATIBILITY.md with ${games.length} games`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
