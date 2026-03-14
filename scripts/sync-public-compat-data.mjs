import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const sourceToTarget = [
  ["data/compatibility.json", "public/compatibility/data.json"],
  ["data/discussions.json", "public/compatibility/discussions.json"],
  ["data/release-builds.json", "public/builds/release-builds.json"],
  ["data/builds-history.json", "public/builds/history.json"],
];

const STATUS_RANK = {
  untested: -1,
  nothing: 0,
  loads: 1,
  intro: 2,
  ingame: 3,
  playable: 4,
};

const PLATFORM_ORDER = ["ios", "macos"];

function parseDateValue(value) {
  if (typeof value !== "string" || !value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
}

function alphaBucketForTitle(title) {
  const normalized = String(title || "")
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalized) {
    return "#";
  }

  const firstChar = normalized[0]?.toUpperCase() ?? "#";
  if (/[0-9]/.test(firstChar)) return "0-9";
  if (/[A-Z]/.test(firstChar)) return firstChar;
  return "#";
}

function normalizePerf(value) {
  return value === "great" || value === "ok" || value === "poor" || value === "n/a"
    ? value
    : "n/a";
}

function normalizeStatus(value) {
  return value === "playable" ||
    value === "ingame" ||
    value === "intro" ||
    value === "loads" ||
    value === "nothing" ||
    value === "untested"
    ? value
    : "untested";
}

function deriveStatus(statuses) {
  if (statuses.length === 0) return "untested";

  const bestStatus = statuses.reduce((best, status) => {
    return STATUS_RANK[status] > STATUS_RANK[best] ? status : best;
  }, "untested");

  if (bestStatus === "playable" && statuses.some((status) => status !== "playable")) {
    return "ingame";
  }

  return bestStatus;
}

function derivePerf(reports, status) {
  if (reports.length === 0 || status === "untested" || status === "nothing") {
    return "n/a";
  }

  const perfs = reports
    .map((report) => report?.perf)
    .filter((perf) => perf === "great" || perf === "ok" || perf === "poor");

  if (perfs.includes("poor")) return "poor";
  if (perfs.includes("ok")) return "ok";
  if (perfs.includes("great")) return "great";
  return "n/a";
}

function buildPlatformEntry(game, platform) {
  const reports = (Array.isArray(game?.reports) ? game.reports : [])
    .filter((report) => report && report.platform === platform)
    .sort((left, right) => parseDateValue(right?.date) - parseDateValue(left?.date));

  if (reports.length === 0) {
    return null;
  }

  const status = deriveStatus(reports.map((report) => normalizeStatus(report?.status)));
  const observedDevices = uniqueStrings(reports.map((report) => cleanString(report?.device)));

  return {
    platform,
    status,
    perf: derivePerf(reports, status),
    updatedAt: cleanString(reports[0]?.date),
    observedDevices,
    variesByDevice: new Set(reports.map((report) => normalizeStatus(report?.status))).size > 1,
    verified: true,
  };
}

function selectPrimaryPlatformEntry(entries) {
  if (entries.length === 0) return null;

  const priority = (entry) => {
    let score = 0;
    if (entry.platform === "ios") score += 100;
    if (entry.verified) score += 10;
    if (entry.variesByDevice) score -= 1;
    return score;
  };

  return [...entries].sort((left, right) => priority(right) - priority(left))[0] ?? null;
}

function buildSearchIndexEntry(game) {
  const platformEntries = PLATFORM_ORDER.map((platform) => buildPlatformEntry(game, platform)).filter(
    Boolean,
  );
  const primaryPlatformEntry = selectPrimaryPlatformEntry(platformEntries);
  const observedDevices = primaryPlatformEntry?.observedDevices ?? [];
  const title = cleanString(game?.title) || "Unknown Title";
  const titleId = cleanString(game?.titleId) || "UNKNOWN";
  const titleIds = uniqueStrings(
    Array.isArray(game?.titleIds) && game.titleIds.length > 0 ? game.titleIds : [titleId],
  );
  const updatedAt = primaryPlatformEntry?.updatedAt || cleanString(game?.updatedAt);
  const searchText = uniqueStrings([
    title,
    titleId,
    ...titleIds,
    ...(Array.isArray(game?.tags) ? game.tags : []),
  ])
    .join("\n")
    .toLowerCase();

  return {
    game: {
      slug: cleanString(game?.slug),
      title,
      titleId,
      titleIds,
    },
    platform: primaryPlatformEntry?.platform ?? null,
    status: primaryPlatformEntry?.status ?? normalizeStatus(game?.status),
    perf: primaryPlatformEntry?.perf ?? normalizePerf(game?.perf),
    updatedAt,
    observedDevices,
    variesByDevice: primaryPlatformEntry?.variesByDevice ?? false,
    platformEntries,
    searchText,
    titleBucket: alphaBucketForTitle(title),
  };
}

async function syncFile(sourceRelativePath, targetRelativePath) {
  const source = path.join(repoRoot, sourceRelativePath);
  const target = path.join(repoRoot, targetRelativePath);

  await fs.mkdir(path.dirname(target), { recursive: true });
  const content = await fs.readFile(source, "utf8");
  await fs.writeFile(target, content, "utf8");
}

async function writeSearchIndex() {
  const source = path.join(repoRoot, "data", "compatibility.json");
  const target = path.join(repoRoot, "public", "compatibility", "search-index.json");
  const content = await fs.readFile(source, "utf8");
  const games = JSON.parse(content);
  const index = Array.isArray(games) ? games.map((game) => buildSearchIndexEntry(game)) : [];

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(index)}\n`, "utf8");
  console.log(`Built compatibility search index with ${index.length} titles`);
}

async function main() {
  for (const [source, target] of sourceToTarget) {
    await syncFile(source, target);
    console.log(`Synced ${source} -> ${target}`);
  }

  await writeSearchIndex();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
