import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const owner = process.env.COMPAT_SOURCE_OWNER || "xenios-jp";
const repo = process.env.COMPAT_SOURCE_REPO || "game-compatibility";
const branch = process.env.COMPAT_SOURCE_BRANCH || "main";
const BASE_CATALOG_PATH = "data/compatibility-base.json";

const STATUS_RANK = {
  nothing: 0,
  loads: 1,
  intro: 2,
  ingame: 3,
  playable: 4,
};

const GENERIC_GAME_TITLE_PATTERN = /^Title [A-F0-9]{8}$/i;
const ISSUE_TITLE_ID_PREFIX_PATTERN = /^\[?[A-F0-9]{8}\]?\s*(?:—|-)\s*/i;
const WRAPPED_GAME_TITLE_PATTERN = /^\[(.+)\]([™®©])?$/u;

async function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function writeJson(relativePath, value) {
  const filePath = path.join(repoRoot, relativePath);
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "xenios-website-compat-rebuild",
      ...headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function cleanString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeTitleId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-F0-9]{8}$/.test(normalized) ? normalized : null;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeGameTitle(value) {
  const cleaned = cleanString(value);
  if (!cleaned) return "";

  const wrappedMatch = cleaned.match(WRAPPED_GAME_TITLE_PATTERN);
  if (!wrappedMatch) {
    return cleaned;
  }

  const innerTitle = wrappedMatch[1]?.trim();
  const suffix = wrappedMatch[2] ?? "";
  return innerTitle ? `${innerTitle}${suffix}` : cleaned;
}

function normalizeComparableText(value) {
  return cleanString(value).toLowerCase().replace(/\s+/g, " ");
}

function normalizeDateOnly(value) {
  const cleaned = cleanString(value);
  if (!cleaned) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function parseDateValue(value) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareReportsByDate(left, right) {
  const byDate = parseDateValue(right.date) - parseDateValue(left.date);
  if (byDate !== 0) return byDate;
  return (STATUS_RANK[right.status] ?? 0) - (STATUS_RANK[left.status] ?? 0);
}

function compareReports(left, right) {
  const rankDelta = (STATUS_RANK[right.status] ?? 0) - (STATUS_RANK[left.status] ?? 0);
  if (rankDelta !== 0) return rankDelta;
  return right.date.localeCompare(left.date);
}

function mergeUniqueValues(...lists) {
  const seen = new Set();
  const merged = [];

  for (const list of lists) {
    for (const value of list ?? []) {
      if (!value || seen.has(value)) continue;
      seen.add(value);
      merged.push(value);
    }
  }

  return merged;
}

function normalizePlatform(value) {
  if (value === "ios" || value === "macos") return value;
  const cleaned = cleanString(value).toLowerCase();
  if (cleaned === "ios" || cleaned === "ipados") return "ios";
  if (cleaned === "macos" || cleaned === "os x") return "macos";
  return null;
}

function normalizeStatus(value) {
  const cleaned = cleanString(value).toLowerCase();
  if (cleaned === "playable") return "playable";
  if (cleaned === "ingame" || cleaned === "in-game") return "ingame";
  if (cleaned === "intro") return "intro";
  if (cleaned === "loads") return "loads";
  if (cleaned === "nothing" || cleaned === "doesn't boot" || cleaned === "doesnt boot") {
    return "nothing";
  }
  if (cleaned.startsWith("playable")) return "playable";
  if (cleaned.startsWith("in-game")) return "ingame";
  if (cleaned.startsWith("intro")) return "intro";
  if (cleaned.startsWith("loads")) return "loads";
  if (cleaned.startsWith("nothing")) return "nothing";
  return null;
}

function normalizePerf(value) {
  const cleaned = cleanString(value).toLowerCase();
  if (cleaned === "great") return "great";
  if (cleaned === "ok" || cleaned === "okay") return "ok";
  if (cleaned === "poor") return "poor";
  if (cleaned === "n/a" || cleaned === "na") return "n/a";
  if (cleaned.startsWith("great")) return "great";
  if (cleaned.startsWith("ok") || cleaned.startsWith("okay")) return "ok";
  if (cleaned.startsWith("poor")) return "poor";
  if (cleaned.startsWith("n/a")) return "n/a";
  return null;
}

function normalizeArchitecture(value) {
  const cleaned = cleanString(value).toLowerCase();
  if (cleaned === "arm64" || cleaned === "arm 64") return "arm64";
  if (cleaned === "x86_64" || cleaned === "x64" || cleaned === "x86-64") return "x86_64";
  return null;
}

function normalizeGpuBackend(value) {
  const cleaned = cleanString(value).toLowerCase();
  if (cleaned === "msc") return "msc";
  if (cleaned === "msl") return "msl";
  if (cleaned.startsWith("metal")) return "msl";
  return null;
}

function normalizeBuildChannel(value) {
  const cleaned = cleanString(value).toLowerCase();
  if (cleaned === "release") return "release";
  if (cleaned === "preview") return "preview";
  if (cleaned === "self-built" || cleaned === "self built") return "self-built";
  return null;
}

function cleanCommitShort(value) {
  const cleaned = cleanString(value).replace(/`/g, "");
  if (!cleaned || cleaned.toLowerCase() === "_no response_") return undefined;
  return cleaned;
}

function normalizeReportBuild(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const channel = normalizeBuildChannel(value.channel);
  const build = {
    buildId: cleanString(value.buildId) || undefined,
    channel: channel ?? undefined,
    official:
      typeof value.official === "boolean"
        ? value.official
        : channel
          ? channel !== "self-built"
          : undefined,
    appVersion: cleanString(value.appVersion) || undefined,
    buildNumber: cleanString(value.buildNumber) || undefined,
    stage: cleanString(value.stage) || undefined,
    commitShort: cleanCommitShort(value.commitShort),
    publishedAt: cleanString(value.publishedAt) || undefined,
  };

  return Object.values(build).some((entry) => entry !== undefined) ? build : undefined;
}

function normalizeReport(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const device = cleanString(value.device);
  const platform = normalizePlatform(value.platform);
  const osVersion = cleanString(value.osVersion);
  const arch = normalizeArchitecture(value.arch);
  const gpuBackend = normalizeGpuBackend(value.gpuBackend);
  const status = normalizeStatus(value.status);
  const date = normalizeDateOnly(value.date);
  const notes = cleanString(value.notes);

  if (!device || !platform || !osVersion || !arch || !gpuBackend || !status || !date) {
    return null;
  }

  return {
    device,
    platform,
    osVersion,
    arch,
    gpuBackend,
    status,
    perf: normalizePerf(value.perf) ?? undefined,
    date,
    notes,
    reportedTitleId: normalizeTitleId(value.reportedTitleId) ?? undefined,
    reportedTitle: normalizeGameTitle(value.reportedTitle) || undefined,
    screenshots: normalizeStringArray(value.screenshots),
    submittedBy: cleanString(value.submittedBy) || undefined,
    source:
      value.source === "app" || value.source === "discord" || value.source === "github"
        ? value.source
        : undefined,
    build: normalizeReportBuild(value.build),
  };
}

function reportIdentity(report) {
  return [
    report.date,
    report.platform,
    report.device,
    report.status,
    report.perf ?? "unknown",
    report.build?.buildId ?? "",
    report.build?.buildNumber ?? "",
    report.build?.commitShort ?? "",
    report.notes,
  ].join("|");
}

function dedupeReports(reports) {
  const deduped = new Map();

  [...reports]
    .sort(compareReportsByDate)
    .forEach((report) => {
      const key = reportIdentity(report);
      if (!deduped.has(key)) {
        deduped.set(key, report);
      }
    });

  return [...deduped.values()];
}

function snapshotFromReport(report) {
  return {
    device: report.device,
    platform: report.platform,
    osVersion: report.osVersion,
    arch: report.arch,
    gpuBackend: report.gpuBackend,
  };
}

function summarizeReports(reports, channel) {
  if (reports.length === 0) {
    return {
      channel,
      status: "untested",
      perf: null,
      notes: "",
      updatedAt: null,
      date: null,
      reportCount: 0,
      latestReport: null,
      bestReport: null,
    };
  }

  const sortedByQuality = [...reports].sort(compareReports);
  const bestReport = sortedByQuality[0] ?? null;
  const newestReport =
    [...reports].sort((left, right) => right.date.localeCompare(left.date))[0] ?? null;
  const perf =
    bestReport?.perf ??
    (bestReport?.status === "nothing" ? "n/a" : null);

  return {
    channel,
    status: bestReport?.status ?? "untested",
    perf,
    notes: bestReport?.notes ?? "",
    updatedAt: newestReport?.date ?? null,
    date: newestReport?.date ?? null,
    reportCount: reports.length,
    latestReport: newestReport,
    bestReport,
  };
}

function buildSummaries(reports) {
  const normalizedReports = dedupeReports(reports.map((report) => normalizeReport(report)).filter(Boolean));
  const hasChannelMetadata = normalizedReports.some((report) => Boolean(report.build?.channel));
  const releaseReports = hasChannelMetadata
    ? normalizedReports.filter(
        (report) => report.build?.channel === "release" || !report.build?.channel,
      )
    : normalizedReports;
  const previewReports = hasChannelMetadata
    ? normalizedReports.filter((report) => report.build?.channel === "preview")
    : [];

  return {
    release: summarizeReports(releaseReports, "release"),
    preview: summarizeReports(previewReports, "preview"),
    all: summarizeReports(normalizedReports, "all"),
  };
}

function isGenericGameTitle(title) {
  const cleaned = cleanString(title);
  return !cleaned || cleaned === "Unknown Title" || GENERIC_GAME_TITLE_PATTERN.test(cleaned);
}

function getPrimaryTitleId(game) {
  return normalizeTitleId(game.titleId) ?? null;
}

function getKnownTitleIds(game) {
  return mergeUniqueValues(
    getPrimaryTitleId(game) ? [getPrimaryTitleId(game)] : [],
    normalizeStringArray(game.titleIds).map(normalizeTitleId).filter(Boolean),
  );
}

function chooseCanonicalGame(existing, incoming) {
  if (isGenericGameTitle(existing.title) && !isGenericGameTitle(incoming.title)) {
    return incoming;
  }
  if (!cleanString(existing.slug) && cleanString(incoming.slug)) {
    return incoming;
  }
  return existing;
}

function normalizeGameRecord(record) {
  const titleId = normalizeTitleId(record.titleId) ?? "UNKNOWN";
  const titleIds = mergeUniqueValues(
    [titleId].filter((candidate) => candidate !== "UNKNOWN"),
    normalizeStringArray(record.titleIds).map(normalizeTitleId).filter(Boolean),
  );
  const reports = dedupeReports(
    (Array.isArray(record.reports) ? record.reports : [])
      .map((entry) => normalizeReport(entry))
      .filter(Boolean),
  );
  const summaries = buildSummaries(reports);
  const allSummary = summaries.all;
  const status = allSummary.status === "untested" ? "nothing" : allSummary.status;
  const perf =
    allSummary.status === "untested"
      ? normalizePerf(record.perf) ?? "n/a"
      : allSummary.perf ?? (status === "nothing" ? "n/a" : "n/a");

  return {
    slug: cleanString(record.slug),
    title: normalizeGameTitle(record.title) || "Unknown Title",
    titleId,
    titleIds,
    status,
    perf,
    tags: normalizeStringArray(record.tags),
    platforms: mergeUniqueValues(
      normalizeStringArray(record.platforms).map(normalizePlatform).filter(Boolean),
      reports.map((report) => report.platform),
    ),
    lastReport: allSummary.bestReport ? snapshotFromReport(allSummary.bestReport) : null,
    updatedAt: (allSummary.updatedAt ?? normalizeDateOnly(record.updatedAt)) || "",
    issueNumber:
      typeof record.issueNumber === "number" && Number.isFinite(record.issueNumber)
        ? record.issueNumber
        : undefined,
    issueUrl: cleanString(record.issueUrl) || undefined,
    notes: allSummary.notes || cleanString(record.notes),
    reports,
    screenshots: mergeUniqueValues(
      normalizeStringArray(record.screenshots),
      ...reports.map((report) => report.screenshots ?? []),
    ),
    summaries,
  };
}

function mergeGameRecords(existing, incoming) {
  const canonical = chooseCanonicalGame(existing, incoming);
  const mergedReports = dedupeReports([...existing.reports, ...incoming.reports]);
  const mergedRecord = {
    ...canonical,
    slug: cleanString(canonical.slug) || cleanString(existing.slug) || cleanString(incoming.slug),
    title:
      normalizeGameTitle(canonical.title) ||
      normalizeGameTitle(existing.title) ||
      normalizeGameTitle(incoming.title) ||
      "Unknown Title",
    titleId:
      getPrimaryTitleId(canonical) ??
      getPrimaryTitleId(existing) ??
      getPrimaryTitleId(incoming) ??
      "UNKNOWN",
    titleIds: mergeUniqueValues(getKnownTitleIds(existing), getKnownTitleIds(incoming)),
    tags: mergeUniqueValues(existing.tags, incoming.tags),
    issueNumber: canonical.issueNumber ?? existing.issueNumber ?? incoming.issueNumber,
    issueUrl: canonical.issueUrl ?? existing.issueUrl ?? incoming.issueUrl,
    reports: mergedReports,
    screenshots: mergeUniqueValues(
      existing.screenshots,
      incoming.screenshots,
      ...mergedReports.map((report) => report.screenshots ?? []),
    ),
    platforms: mergeUniqueValues(
      existing.platforms,
      incoming.platforms,
      mergedReports.map((report) => report.platform),
    ),
    notes: cleanString(canonical.notes) || cleanString(existing.notes) || cleanString(incoming.notes),
    updatedAt:
      parseDateValue(incoming.updatedAt) > parseDateValue(existing.updatedAt)
        ? incoming.updatedAt
        : existing.updatedAt,
  };

  return normalizeGameRecord(mergedRecord);
}

function getSection(body, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`### ${escaped}\\s*\\n\\n([\\s\\S]*?)(?=\\n### |$)`, "i"));
  return match?.[1]?.trim() ?? "";
}

function extractIssueImages(body) {
  const markdownMatches = [...body.matchAll(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/g)].map(
    (match) => match[1],
  );
  const htmlMatches = [...body.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  return mergeUniqueValues(markdownMatches, htmlMatches);
}

function parseGameTitleFromIssueTitle(issueTitle) {
  const cleaned = normalizeGameTitle(
    cleanString(issueTitle)
      .replace(ISSUE_TITLE_ID_PREFIX_PATTERN, "")
      .replace(/^\[?[A-F0-9]{8}\]?\s*/i, "")
      .trim(),
  );
  return cleaned || null;
}

function parseIssueLabels(issue) {
  const labels = Array.isArray(issue.labels) ? issue.labels : [];
  const labelValue = (prefix) => {
    const match = labels
      .map((label) => cleanString(label?.name))
      .find((name) => name.toLowerCase().startsWith(prefix));
    return match ? match.slice(prefix.length) : "";
  };

  return {
    status: normalizeStatus(labelValue("state:")),
    perf: normalizePerf(labelValue("perf:")),
    platform: normalizePlatform(labelValue("platform:")),
    gpuBackend: normalizeGpuBackend(labelValue("gpu:")),
    buildChannel: normalizeBuildChannel(labelValue("channel:")),
  };
}

function inferArchitecture(platform, device) {
  if (platform === "ios") return "arm64";
  const cleanedDevice = normalizeComparableText(device);
  if (cleanedDevice.includes("intel")) return "x86_64";
  return "arm64";
}

function parseIssueReport(issue, titleId) {
  const body = cleanString(issue.body);
  if (!body) return null;

  const labels = parseIssueLabels(issue);
  const platform =
    normalizePlatform(getSection(body, "Platform")) ??
    labels.platform;
  const device = cleanString(getSection(body, "Device"));
  const osVersion =
    cleanString(getSection(body, "OS Version")) ||
    cleanString(getSection(body, "XeniOS Version"));
  const arch =
    normalizeArchitecture(getSection(body, "Architecture")) ??
    (platform && device ? inferArchitecture(platform, device) : null);
  const gpuBackend =
    normalizeGpuBackend(getSection(body, "GPU Backend")) ??
    labels.gpuBackend;
  const status =
    normalizeStatus(getSection(body, "Compatibility Status")) ??
    labels.status;
  const perf =
    normalizePerf(getSection(body, "Performance")) ??
    labels.perf ??
    undefined;
  const buildChannel =
    normalizeBuildChannel(getSection(body, "Build Channel")) ??
    labels.buildChannel ??
    undefined;
  const buildNumber = cleanString(getSection(body, "Build Number")) || undefined;
  const issueVersion = cleanString(getSection(body, "XeniOS Version"));
  let appVersion = issueVersion || undefined;
  if (appVersion && buildNumber && appVersion.endsWith(`-${buildNumber}`)) {
    appVersion = appVersion.slice(0, -(buildNumber.length + 1)) || undefined;
  }
  const commitShort = cleanCommitShort(getSection(body, "Commit Short"));
  const notes = cleanString(getSection(body, "Notes"));
  const reportedTitle = parseGameTitleFromIssueTitle(issue.title);

  if (!device || !platform || !osVersion || !arch || !gpuBackend || !status) {
    return null;
  }

  const build =
    buildChannel || appVersion || buildNumber || commitShort
      ? {
          buildId:
            appVersion || buildNumber || buildChannel
              ? [platform, buildChannel ?? "release", appVersion, buildNumber]
                  .filter(Boolean)
                  .join("-")
              : undefined,
          channel: buildChannel,
          official: buildChannel ? buildChannel !== "self-built" : undefined,
          appVersion,
          buildNumber,
          commitShort,
        }
      : undefined;

  return normalizeReport({
    device,
    platform,
    osVersion,
    arch,
    gpuBackend,
    status,
    perf,
    date: issue.created_at,
    notes,
    reportedTitleId: titleId,
    reportedTitle,
    screenshots: extractIssueImages(body),
    submittedBy: issue.user?.login,
    source: "github",
    build,
  });
}

async function fetchIssueIndex() {
  const issues = [];

  for (let page = 1; page <= 10; page += 1) {
    const pageIssues = await fetchJson(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}`,
      { Accept: "application/vnd.github+json" },
    );

    const filtered = pageIssues.filter((issue) => !issue.pull_request);
    if (filtered.length === 0) break;
    issues.push(...filtered);

    if (pageIssues.length < 100) break;
  }

  return new Map(issues.map((issue) => [issue.number, issue]));
}

function slugifySyntheticGameTitle(title, titleId) {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || `title-${titleId.toLowerCase()}`;
}

async function main() {
  const [baseCatalog, discussionSnapshot, trackerCatalog, issueIndex] = await Promise.all([
    readJson(BASE_CATALOG_PATH),
    readJson("data/discussions.json"),
    fetchJson(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data/compatibility.json`,
    ),
    fetchIssueIndex(),
  ]);

  const mergedGames = [];
  const keyByTitleId = new Map();
  const titleIndex = new Map();
  let syntheticCounter = 0;

  const indexTitleIds = (key, game) => {
    for (const titleId of getKnownTitleIds(game)) {
      if (!keyByTitleId.has(titleId)) {
        keyByTitleId.set(titleId, key);
      }
    }
  };

  const indexTitle = (game) => {
    const titleKey = normalizeComparableText(game.title);
    if (!titleKey) return;
    const existing = titleIndex.get(titleKey) ?? [];
    existing.push(game);
    titleIndex.set(titleKey, existing);
  };

  const addNewGame = (game) => {
    const key = getPrimaryTitleId(game) ?? game.slug ?? `synthetic-${syntheticCounter++}`;
    mergedGames.push({ key, game });
    indexTitleIds(key, game);
    indexTitle(game);
    return key;
  };

  const findGameByKnownTitleId = (titleIds) => {
    for (const titleId of titleIds) {
      const key = keyByTitleId.get(titleId);
      if (key) {
        return mergedGames.find((entry) => entry.key === key) ?? null;
      }
    }
    return null;
  };

  const seedBaseGame = (rawGame) => {
    const game = normalizeGameRecord(rawGame);
    addNewGame(game);
  };

  const upsertTrackerGame = (rawGame) => {
    const game = normalizeGameRecord(rawGame);
    const existingEntry = findGameByKnownTitleId(getKnownTitleIds(game));

    if (!existingEntry) {
      addNewGame(game);
      return;
    }

    existingEntry.game = mergeGameRecords(existingEntry.game, game);
    indexTitleIds(existingEntry.key, existingEntry.game);
    indexTitle(existingEntry.game);
  };

  baseCatalog.forEach(seedBaseGame);
  trackerCatalog.forEach(upsertTrackerGame);

  for (const discussion of Object.values(discussionSnapshot.discussions ?? {})) {
    const discussionTitleId = normalizeTitleId(discussion.titleId);
    if (!discussionTitleId) continue;

    let targetEntry = findGameByKnownTitleId([discussionTitleId]);
    const issue = issueIndex.get(discussion.issueNumber);
    const inferredTitle = issue ? parseGameTitleFromIssueTitle(issue.title) : null;

    if (!targetEntry && inferredTitle) {
      const titleMatches = titleIndex.get(normalizeComparableText(inferredTitle)) ?? [];
      if (titleMatches.length === 1) {
        const targetGame = titleMatches[0];
        targetGame.titleIds = mergeUniqueValues(getKnownTitleIds(targetGame), [discussionTitleId]);
        const key = mergedGames.find((entry) => entry.game === targetGame)?.key;
        if (key) {
          indexTitleIds(key, targetGame);
          targetEntry = mergedGames.find((entry) => entry.key === key) ?? null;
        }
      }
    }

    const needsSupplementalReport =
      !targetEntry ||
      !targetEntry.game.reports.some(
        (report) =>
          normalizeTitleId(report.reportedTitleId) === discussionTitleId ||
          (targetEntry.game.issueNumber === discussion.issueNumber &&
            targetEntry.game.reports.length > 0),
      );
    const supplementalReport =
      needsSupplementalReport && issue ? parseIssueReport(issue, discussionTitleId) : null;

    if (!targetEntry) {
      const syntheticTitle = inferredTitle ?? `Title ${discussionTitleId}`;
      let syntheticSlug = slugifySyntheticGameTitle(syntheticTitle, discussionTitleId);
      if (mergedGames.some((entry) => entry.game.slug === syntheticSlug)) {
        syntheticSlug = `${syntheticSlug}-${syntheticCounter++}`;
      }

      const syntheticGame = normalizeGameRecord({
        slug: syntheticSlug,
        title: syntheticTitle,
        titleId: discussionTitleId,
        titleIds: [discussionTitleId],
        issueNumber: discussion.issueNumber,
        issueUrl: discussion.issueUrl,
        updatedAt: discussion.updatedAt,
        notes: cleanString(discussion.entries?.[0]?.excerpt),
        reports: supplementalReport ? [supplementalReport] : [],
        screenshots: mergeUniqueValues(
          ...(discussion.entries ?? []).map((entry) => normalizeStringArray(entry.images)),
          supplementalReport ? supplementalReport.screenshots ?? [] : [],
        ),
        platforms: supplementalReport ? [supplementalReport.platform] : [],
        tags: [],
      });

      addNewGame(syntheticGame);
      continue;
    }

    const mergedSupplement = normalizeGameRecord({
      ...targetEntry.game,
      titleIds: mergeUniqueValues(getKnownTitleIds(targetEntry.game), [discussionTitleId]),
      issueNumber: targetEntry.game.issueNumber ?? discussion.issueNumber,
      issueUrl: targetEntry.game.issueUrl ?? discussion.issueUrl,
      updatedAt:
        parseDateValue(discussion.updatedAt) > parseDateValue(targetEntry.game.updatedAt)
          ? discussion.updatedAt
          : targetEntry.game.updatedAt,
      reports: supplementalReport
        ? [...targetEntry.game.reports, supplementalReport]
        : targetEntry.game.reports,
      screenshots: mergeUniqueValues(
        targetEntry.game.screenshots,
        ...(discussion.entries ?? []).map((entry) => normalizeStringArray(entry.images)),
        supplementalReport ? supplementalReport.screenshots ?? [] : [],
      ),
      platforms: supplementalReport
        ? mergeUniqueValues(targetEntry.game.platforms, [supplementalReport.platform])
        : targetEntry.game.platforms,
    });

    targetEntry.game = mergedSupplement;
    indexTitleIds(targetEntry.key, targetEntry.game);
    indexTitle(targetEntry.game);
  }

  const finalCatalog = mergedGames.map((entry) => entry.game);
  await writeJson("data/compatibility.json", finalCatalog);

  const testedCount = finalCatalog.filter(
    (game) => game.lastReport && Array.isArray(game.platforms) && game.platforms.length > 0,
  ).length;

  console.log(
    `Rebuilt data/compatibility.json with ${finalCatalog.length} titles and ${testedCount} tested games`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
