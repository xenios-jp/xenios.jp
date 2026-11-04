import compatData from "../../data/compatibility.json";
import DEVICE_NAMES from "@/../data/device-names.json";
import { getBuildDisplayLabel } from "@/lib/build-display";

export type GameStatus = "playable" | "ingame" | "intro" | "loads" | "nothing";
export type SummaryStatus = GameStatus | "untested";
export type PerfTier = "great" | "ok" | "poor" | "n/a";
export type Platform = "ios" | "macos";
export type Architecture = "arm64" | "x86_64";
export type GpuBackend = "msc" | "msl";
export type ReportSource = "app" | "discord" | "github";
// The build a report was tested on, shown as "2.2 (11357)".
export interface ReportBuild {
  appVersion: string;
  buildNumber: string;
  commitShort?: string;
}

export interface LastReportSnapshot {
  device: string;
  platform: Platform;
  osVersion: string;
  arch: Architecture;
  gpuBackend: GpuBackend;
}

export interface GameReport extends LastReportSnapshot {
  status: GameStatus;
  perf?: PerfTier;
  date: string;
  notes: string;
  reportedTitleId?: string;
  reportedTitle?: string;
  screenshots?: string[];
  submittedBy?: string;
  source?: ReportSource;
  build?: ReportBuild;
}

export interface GameSummary {
  status: SummaryStatus;
  perf: PerfTier;
  updatedAt: string;
  notes: string;
  lastReport: LastReportSnapshot | null;
  reportCount: number;
  build?: ReportBuild;
}

export interface Game {
  slug: string;
  title: string;
  titleId: string;
  titleIds: string[];
  status: GameStatus;
  perf: PerfTier;
  tags: string[];
  platforms: Platform[];
  lastReport: LastReportSnapshot | null;
  updatedAt: string;
  issueNumber?: number;
  issueUrl?: string;
  notes: string;
  reports: GameReport[];
  screenshots: string[];
  summary: GameSummary;
}

export interface StatusOption {
  value: GameStatus;
  label: string;
  description: string;
}

export interface SummaryStatusOption {
  value: SummaryStatus;
  label: string;
  description: string;
}

export interface PerfTierOption {
  value: PerfTier;
  label: string;
  description: string;
}

export interface PlatformOption {
  value: Platform;
  label: string;
  description: string;
}

const GAME_STATUSES: GameStatus[] = [
  "playable",
  "ingame",
  "intro",
  "loads",
  "nothing",
];

export const SUMMARY_STATUS_ORDER: SummaryStatus[] = [
  "playable",
  "ingame",
  "intro",
  "loads",
  "nothing",
  "untested",
];

const STATUS_RANK: Record<GameStatus, number> = {
  playable: 4,
  ingame: 3,
  intro: 2,
  loads: 1,
  nothing: 0,
};

const EMPTY_SUMMARY: GameSummary = {
  status: "untested",
  perf: "n/a",
  updatedAt: "",
  notes: "",
  lastReport: null,
  reportCount: 0,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeGameTitle(value: unknown): string | null {
  const cleaned = cleanString(value);
  if (!cleaned) return null;

  const wrappedMatch = cleaned.match(/^\[(.+)\]([™®©])?$/u);
  if (!wrappedMatch) {
    return cleaned;
  }

  const innerTitle = wrappedMatch[1]?.trim();
  const suffix = wrappedMatch[2] ?? "";
  return innerTitle ? `${innerTitle}${suffix}` : cleaned;
}

function cleanNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeGameStatus(value: unknown): GameStatus | null {
  return GAME_STATUSES.includes(value as GameStatus)
    ? (value as GameStatus)
    : null;
}

function normalizePerfTier(value: unknown): PerfTier | null {
  return value === "great" || value === "ok" || value === "poor" || value === "n/a"
    ? value
    : null;
}

function normalizePlatform(value: unknown): Platform | null {
  return value === "ios" || value === "macos" ? value : null;
}

function normalizeArchitecture(value: unknown): Architecture | null {
  return value === "arm64" || value === "x86_64" ? value : null;
}

function normalizeGpuBackend(value: unknown): GpuBackend | null {
  return value === "msc" || value === "msl" ? value : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeTitleId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-F0-9]{8}$/.test(normalized) ? normalized : null;
}

function normalizeTitleIds(value: unknown, fallbackTitleId?: string | null): string[] {
  const seen = new Set<string>();
  const titleIds: string[] = [];

  const pushTitleId = (candidate: unknown) => {
    const normalized = normalizeTitleId(candidate);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    titleIds.push(normalized);
  };

  pushTitleId(fallbackTitleId);
  if (Array.isArray(value)) {
    value.forEach((candidate) => pushTitleId(candidate));
  }

  return titleIds;
}

function normalizeBuild(value: unknown): ReportBuild | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const appVersion = cleanString(record.appVersion);
  const buildNumber = cleanString(record.buildNumber);
  if (!appVersion || !buildNumber) return undefined;

  const commitShort = cleanString(record.commitShort);
  return commitShort ? { appVersion, buildNumber, commitShort } : { appVersion, buildNumber };
}

function normalizeLastReport(value: unknown): LastReportSnapshot | null {
  const record = asRecord(value);
  if (!record) return null;

  const device = cleanString(record.device);
  const platform = normalizePlatform(record.platform);
  const osVersion = cleanString(record.osVersion);
  const arch = normalizeArchitecture(record.arch);
  const gpuBackend = normalizeGpuBackend(record.gpuBackend);

  if (!device || !platform || !osVersion || !arch || !gpuBackend) {
    return null;
  }

  return {
    device,
    platform,
    osVersion,
    arch,
    gpuBackend,
  };
}

function snapshotFromReport(report: GameReport): LastReportSnapshot {
  return {
    device: report.device,
    platform: report.platform,
    osVersion: report.osVersion,
    arch: report.arch,
    gpuBackend: report.gpuBackend,
  };
}

function normalizeReport(value: unknown): GameReport | null {
  const record = asRecord(value);
  if (!record) return null;

  const device = cleanString(record.device);
  const platform = normalizePlatform(record.platform);
  const osVersion = cleanString(record.osVersion);
  const arch = normalizeArchitecture(record.arch);
  const gpuBackend = normalizeGpuBackend(record.gpuBackend);
  const status = normalizeGameStatus(record.status);
  const date = cleanString(record.date);
  const notes = cleanString(record.notes) ?? "";

  if (!device || !platform || !osVersion || !arch || !gpuBackend || !status || !date) {
    return null;
  }

  const perf = normalizePerfTier(record.perf) ?? undefined;

  return {
    device,
    platform,
    osVersion,
    arch,
    gpuBackend,
    status,
    perf,
    date,
    notes,
    reportedTitleId: normalizeTitleId(record.reportedTitleId) ?? undefined,
    reportedTitle: normalizeGameTitle(record.reportedTitle) ?? undefined,
    screenshots: normalizeStringArray(record.screenshots),
    submittedBy: cleanString(record.submittedBy) ?? undefined,
    source:
      record.source === "app" || record.source === "discord" || record.source === "github"
        ? record.source
        : undefined,
    build: normalizeBuild(record.build),
  };
}

function compareReports(left: GameReport, right: GameReport): number {
  const leftRank = STATUS_RANK[left.status];
  const rightRank = STATUS_RANK[right.status];
  if (leftRank !== rightRank) {
    return rightRank - leftRank;
  }
  return right.date.localeCompare(left.date);
}

function getNewestReport(reports: GameReport[]): GameReport | null {
  if (reports.length === 0) return null;
  return [...reports].sort((left, right) => right.date.localeCompare(left.date))[0] ?? null;
}

function summarizeReports(
  reports: GameReport[],
  fallback?: Partial<GameSummary>,
): GameSummary {
  if (reports.length === 0) {
    if (!fallback) return EMPTY_SUMMARY;
    return {
      status: fallback.status ?? "untested",
      perf: fallback.perf ?? "n/a",
      updatedAt: fallback.updatedAt ?? "",
      notes: fallback.notes ?? "",
      lastReport: fallback.lastReport ?? null,
      reportCount: fallback.reportCount ?? 0,
      build: fallback.build,
    };
  }

  const bestReport = [...reports].sort(compareReports)[0] ?? reports[0];
  const newestReport = getNewestReport(reports) ?? bestReport;

  return {
    status: bestReport.status,
    perf:
      bestReport.perf ??
      (bestReport.status === "nothing" ? "n/a" : fallback?.perf ?? "n/a"),
    updatedAt: newestReport.date,
    notes: bestReport.notes || fallback?.notes || "",
    lastReport: snapshotFromReport(bestReport),
    reportCount: reports.length,
    build: bestReport.build ?? fallback?.build,
  };
}

function getTopLevelFallbackSummary(record: Record<string, unknown>): Partial<GameSummary> | undefined {
  const status = normalizeGameStatus(record.status);
  const lastReport = normalizeLastReport(record.lastReport);
  const updatedAt = cleanString(record.updatedAt) ?? "";
  const notes = cleanString(record.notes) ?? "";
  const perf =
    normalizePerfTier(record.perf) ??
    (status === "nothing" ? "n/a" : null);

  if (!status && !lastReport && !updatedAt && !notes && !perf) {
    return undefined;
  }

  return {
    status: status ?? "untested",
    perf: perf ?? "n/a",
    updatedAt,
    notes,
    lastReport,
    reportCount: status ? 1 : 0,
  };
}

function normalizePlatforms(record: Record<string, unknown>, reports: GameReport[]): Platform[] {
  const rawPlatforms = Array.isArray(record.platforms)
    ? record.platforms
        .map((entry) => normalizePlatform(entry))
        .filter((entry): entry is Platform => entry !== null)
    : [];

  const inferred = reports.map((report) => report.platform);
  const unique = new Set<Platform>([...rawPlatforms, ...inferred]);
  return [...unique];
}

function normalizeGame(value: unknown): Game {
  const record = asRecord(value) ?? {};
  const reports = Array.isArray(record.reports)
    ? record.reports
        .map((entry) => normalizeReport(entry))
        .filter((entry): entry is GameReport => entry !== null)
    : [];

  const summary = summarizeReports(reports, getTopLevelFallbackSummary(record));

  const topLevelStatus =
    normalizeGameStatus(record.status) ??
    (summary.status === "untested" ? "nothing" : summary.status);
  const topLevelPerf =
    normalizePerfTier(record.perf) ??
    (summary.status === "nothing" ? "n/a" : summary.perf);
  const titleId = normalizeTitleId(record.titleId) ?? "UNKNOWN";
  const titleIds = normalizeTitleIds(record.titleIds, titleId);

  return {
    slug: cleanString(record.slug) ?? "",
    title: normalizeGameTitle(record.title) ?? "Unknown Title",
    titleId,
    titleIds,
    status: topLevelStatus,
    perf: topLevelPerf,
    tags: normalizeStringArray(record.tags),
    platforms: normalizePlatforms(record, reports),
    lastReport: normalizeLastReport(record.lastReport) ?? summary.lastReport,
    updatedAt: cleanString(record.updatedAt) ?? summary.updatedAt,
    issueNumber: cleanNumber(record.issueNumber) ?? undefined,
    issueUrl: cleanString(record.issueUrl) ?? undefined,
    notes: cleanString(record.notes) ?? summary.notes,
    reports,
    screenshots: normalizeStringArray(record.screenshots),
    summary,
  };
}

export function normalizeGames(value: unknown): Game[] {
  return Array.isArray(value) ? value.map((entry) => normalizeGame(entry)) : [];
}

const normalizedGames = normalizeGames(compatData);

export function getStatuses(): StatusOption[] {
  return [
    {
      value: "playable",
      label: "Playable",
      description: "Game can be played from start to finish with minor issues.",
    },
    {
      value: "ingame",
      label: "In-Game",
      description: "Reaches gameplay but has significant issues preventing completion.",
    },
    {
      value: "intro",
      label: "Intro",
      description: "Gets past loading screens but crashes before or shortly after gameplay.",
    },
    {
      value: "loads",
      label: "Loads",
      description: "Game boots and shows menus but cannot reach gameplay.",
    },
    {
      value: "nothing",
      label: "Nothing",
      description: "Does not boot or crashes immediately.",
    },
  ];
}

export function getSummaryStatuses(): SummaryStatusOption[] {
  return [
    ...getStatuses(),
    {
      value: "untested",
      label: "Untested",
      description: "No reports yet.",
    },
  ];
}

export function getPerfTiers(): PerfTierOption[] {
  return [
    {
      value: "great",
      label: "Great",
      description: "Runs at or near full speed with no major issues.",
    },
    {
      value: "ok",
      label: "OK",
      description: "Playable but with noticeable performance drops.",
    },
    {
      value: "poor",
      label: "Poor",
      description: "Significant performance issues; may be unplayable.",
    },
    {
      value: "n/a",
      label: "N/A",
      description: "No meaningful performance data for this result.",
    },
  ];
}

export function getPlatforms(): PlatformOption[] {
  return [
    {
      value: "ios",
      label: "iOS",
      description: "iPhone and iPad running iOS/iPadOS.",
    },
    {
      value: "macos",
      label: "macOS",
      description: "Mac running macOS (ARM64 or x86_64).",
    },
  ];
}

export function getAllGames(): Game[] {
  return normalizedGames;
}

export function getGameBySlug(slug: string): Game | undefined {
  return normalizedGames.find((game) => game.slug === slug);
}

const DEVICE_NAME_MAP = DEVICE_NAMES as Record<string, string>;
const NORMALIZED_DEVICE_NAMES = new Map<string, string>();

function normalizeDeviceLookupKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

for (const [input, output] of Object.entries(DEVICE_NAME_MAP)) {
  NORMALIZED_DEVICE_NAMES.set(normalizeDeviceLookupKey(input), output);
  NORMALIZED_DEVICE_NAMES.set(normalizeDeviceLookupKey(output), output);
}

export function deviceName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  return (
    DEVICE_NAME_MAP[trimmed] ||
    NORMALIZED_DEVICE_NAMES.get(normalizeDeviceLookupKey(trimmed)) ||
    trimmed
  );
}

export function getStatusLabel(status: SummaryStatus): string {
  const labels: Record<SummaryStatus, string> = {
    playable: "Playable",
    ingame: "In-Game",
    intro: "Intro",
    loads: "Loads",
    nothing: "Nothing",
    untested: "Untested",
  };
  return labels[status];
}

export function getPerfLabel(perf: PerfTier): string {
  const labels: Record<PerfTier, string> = {
    great: "Great",
    ok: "OK",
    poor: "Poor",
    "n/a": "N/A",
  };
  return labels[perf];
}

export function getPlatformLabel(platform: Platform): string {
  return platform === "ios" ? "iOS" : "macOS";
}

export function getGpuLabel(gpuBackend: GpuBackend): string {
  return gpuBackend === "msc" ? "MSC" : "MSL";
}

export function formatReportBuildLabel(build?: ReportBuild | null): string | null {
  return build ? getBuildDisplayLabel(build) : null;
}
