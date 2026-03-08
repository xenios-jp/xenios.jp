import "server-only";

import { cache } from "react";
import {
  deviceName,
  formatReportBuildLabel,
  getAllGames,
  type Game,
  type GameReport,
  type PerfTier,
  type Platform,
  type ReportBuild,
  type ReportSource,
  type SummaryStatus,
  normalizeGames,
} from "@/lib/compatibility";
import {
  getBuildDisplayLabel,
  getLatestBuild,
  isRenderableBuild,
} from "@/lib/builds";
import { getDiscussionByTitleId, type DiscussionEntry } from "@/lib/discussions";

const STATUS_RANK: Record<GameReport["status"], number> = {
  nothing: 0,
  loads: 1,
  intro: 2,
  ingame: 3,
  playable: 4,
};

type ActivityTrack = "release" | "preview" | "self-built" | "legacy" | "discussion";

interface LiveGameDetailResponse {
  issueNumber?: number | null;
  issueUrl?: string | null;
  reports?: unknown[];
}

type LiveGamesResponse = Array<unknown>;

interface ReleaseEvidenceSelection {
  reports: GameReport[];
  buildLabel: string | null;
  basis: string;
  currentBuildKnown: boolean;
}

export interface ReleaseStatusCard {
  platform: Platform;
  status: SummaryStatus;
  perf: PerfTier;
  verified: boolean;
  latestReportDate: string | null;
  buildLabel: string | null;
  reportCount: number;
  basis: string;
  variesByDevice: boolean;
  note: string;
  bestObserved: GameReport | null;
  worstObserved: GameReport | null;
  evidenceKeys: string[];
}

interface BaseActivityItem {
  id: string;
  date: string;
  dateMs: number;
  kind: "report" | "discussion";
  sourceLabel: string;
}

export interface ReportActivityItem extends BaseActivityItem {
  kind: "report";
  report: GameReport;
  discussionEntry?: DiscussionEntry;
  track: Exclude<ActivityTrack, "discussion">;
  trackLabel: string;
  buildLabel: string | null;
  isCurrentReleaseEvidence: boolean;
}

export interface DiscussionActivityItem extends BaseActivityItem {
  kind: "discussion";
  entry: DiscussionEntry;
  track: "discussion";
  trackLabel: string;
  buildLabel: null;
  isCurrentReleaseEvidence: false;
}

export type ActivityItem = ReportActivityItem | DiscussionActivityItem;

export interface GameDetailViewModel {
  issueNumber?: number;
  issueUrl?: string;
  latestActivityDate: string | null;
  totalReportCount: number;
  hiddenReportCount: number;
  releaseCards: ReleaseStatusCard[];
  activity: ActivityItem[];
}

export interface CompatibilityListEntry {
  game: Game;
  platform: Platform | null;
  status: SummaryStatus;
  perf: PerfTier;
  updatedAt: string;
  latestActivityDate: string | null;
  deviceLabel: string;
  observedDevices: string[];
  variesByDevice: boolean;
  hiddenReportCount: number;
  platformEntries: CompatibilityPlatformEntry[];
}

export interface CompatibilityPlatformEntry {
  platform: Platform;
  status: SummaryStatus;
  perf: PerfTier;
  updatedAt: string;
  observedDevices: string[];
  variesByDevice: boolean;
  verified: boolean;
}

function reportIdentity(report: GameReport): string {
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

function parseDateValue(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareReportsByDate(left: GameReport, right: GameReport): number {
  const byDate = parseDateValue(right.date) - parseDateValue(left.date);
  if (byDate !== 0) return byDate;
  return STATUS_RANK[right.status] - STATUS_RANK[left.status];
}

function compareReportsByStatus(
  left: GameReport,
  right: GameReport,
  direction: "best" | "worst",
): number {
  const rankDelta = STATUS_RANK[left.status] - STATUS_RANK[right.status];
  if (rankDelta !== 0) {
    return direction === "best" ? -rankDelta : rankDelta;
  }
  return compareReportsByDate(left, right);
}

function isGameReport(value: unknown): value is GameReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const report = value as Record<string, unknown>;
  return (
    typeof report.device === "string" &&
    (report.platform === "ios" || report.platform === "macos") &&
    typeof report.osVersion === "string" &&
    (report.arch === "arm64" || report.arch === "x86_64") &&
    (report.gpuBackend === "msc" || report.gpuBackend === "msl") &&
    (report.status === "playable" ||
      report.status === "ingame" ||
      report.status === "intro" ||
      report.status === "loads" ||
      report.status === "nothing") &&
    typeof report.date === "string" &&
    typeof report.notes === "string"
  );
}

function normalizeLiveReports(value: unknown): GameReport[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isGameReport).sort(compareReportsByDate);
}

function getSourceLabel(source?: ReportSource): string {
  if (source === "discord") return "Discord";
  if (source === "github") return "GitHub";
  return "In-App Report";
}

function inferPlatformFromDevice(device: string): Platform | null {
  const normalized = device.trim().toLowerCase();
  if (!normalized) return null;

  if (/^(iphone|ipad|ipod)\b/.test(normalized)) return "ios";
  if (
    /^(mac\b|macbook\b|imac\b|mac mini\b|mac studio\b|mac pro\b|mac\d)/.test(normalized)
  ) {
    return "macos";
  }

  return null;
}

function hasPlatformMetadataConflict(report: GameReport): boolean {
  const inferredDevicePlatform = inferPlatformFromDevice(report.device);
  if (inferredDevicePlatform && inferredDevicePlatform !== report.platform) {
    return true;
  }

  const normalizedOs = report.osVersion.trim().toLowerCase();
  if (!normalizedOs) return false;

  if (report.platform === "macos" && /\b(ios|ipados)\b/.test(normalizedOs)) {
    return true;
  }
  if (report.platform === "ios" && /\b(macos|os x)\b/.test(normalizedOs)) {
    return true;
  }

  return false;
}

function partitionReportsByMetadata(reports: GameReport[]): {
  valid: GameReport[];
  hidden: GameReport[];
} {
  const valid: GameReport[] = [];
  const hidden: GameReport[] = [];

  for (const report of reports) {
    if (hasPlatformMetadataConflict(report)) {
      hidden.push(report);
    } else {
      valid.push(report);
    }
  }

  return { valid, hidden };
}

function getBuildFingerprint(build?: ReportBuild | null): string | null {
  if (!build) return null;

  const parts = [
    build.buildId,
    build.appVersion,
    build.buildNumber,
    build.stage,
    build.commitShort,
  ].filter((entry): entry is string => Boolean(entry));

  return parts.length > 0 ? parts.join("|").toLowerCase() : null;
}

function reportMatchesCurrentBuild(
  report: GameReport,
  platform: Platform,
): { matches: boolean; buildLabel: string | null } {
  const currentBuild = getLatestBuild(platform, "release");
  if (!isRenderableBuild(currentBuild)) {
    return { matches: false, buildLabel: null };
  }

  const reportBuild = report.build;
  if (!reportBuild || reportBuild.official === false) {
    return {
      matches: false,
      buildLabel: getBuildDisplayLabel(currentBuild),
    };
  }

  const comparablePairs: Array<[string | undefined, string | undefined]> = [
    [reportBuild.buildId, currentBuild.buildId],
    [reportBuild.appVersion, currentBuild.appVersion],
    [reportBuild.buildNumber, currentBuild.buildNumber],
    [reportBuild.stage, currentBuild.stage],
    [reportBuild.commitShort, currentBuild.commitShort],
  ];

  let comparedFields = 0;
  for (const [left, right] of comparablePairs) {
    if (!left || !right) continue;
    comparedFields += 1;
    if (left.toLowerCase() !== right.toLowerCase()) {
      return {
        matches: false,
        buildLabel: getBuildDisplayLabel(currentBuild),
      };
    }
  }

  return {
    matches: comparedFields > 0,
    buildLabel: getBuildDisplayLabel(currentBuild),
  };
}

function getActivityTrack(report: GameReport): {
  track: Exclude<ActivityTrack, "discussion">;
  trackLabel: string;
  affectsRelease: boolean;
} {
  if (report.build?.channel === "preview") {
    return { track: "preview", trackLabel: "Preview", affectsRelease: false };
  }
  if (report.build?.channel === "self-built" || report.build?.official === false) {
    return { track: "self-built", trackLabel: "Self-built", affectsRelease: false };
  }
  if (report.build?.channel === "release") {
    return { track: "release", trackLabel: "Release", affectsRelease: true };
  }
  return { track: "legacy", trackLabel: "Legacy Release", affectsRelease: true };
}

function compareActivityByDate(left: ActivityItem, right: ActivityItem): number {
  const byDate = right.dateMs - left.dateMs;
  if (byDate !== 0) return byDate;
  return left.id.localeCompare(right.id);
}

function normalizeComparableText(value?: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeComparableDevice(value?: string | null): string {
  return deviceName(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeComparableOsVersion(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/\b(ios|ipados|macos|os x)\b/g, "")
    .replace(/[^0-9.]+/g, "");
}

function normalizeDiscussionPlatform(value?: string | null): Platform | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "ios") return "ios";
  if (normalized === "macos") return "macos";
  return null;
}

function discussionMatchesReport(entry: DiscussionEntry, report: GameReport): boolean {
  if (entry.createdAt !== report.date) return false;

  const entryStatus = entry.meta.status?.trim().toLowerCase();
  if (entryStatus && entryStatus !== report.status) return false;

  const entryPlatform = normalizeDiscussionPlatform(entry.meta.platform);
  if (entryPlatform && entryPlatform !== report.platform) return false;

  const entryGpu = entry.meta.gpuBackend?.trim().toLowerCase();
  if (entryGpu && entryGpu !== report.gpuBackend) return false;

  const entryDevice = normalizeComparableDevice(entry.meta.device);
  if (entryDevice && entryDevice !== normalizeComparableDevice(report.device)) return false;

  const entryOsVersion = normalizeComparableOsVersion(entry.meta.osVersion);
  if (entryOsVersion && entryOsVersion !== normalizeComparableOsVersion(report.osVersion)) {
    return false;
  }

  const reportNotes = normalizeComparableText(report.notes);
  const entryExcerpt = normalizeComparableText(entry.excerpt);
  if (!reportNotes || !entryExcerpt) return false;

  return (
    reportNotes === entryExcerpt ||
    reportNotes.startsWith(entryExcerpt) ||
    entryExcerpt.startsWith(reportNotes)
  );
}

function selectNewestExplicitReleaseGroup(reports: GameReport[]): GameReport[] {
  const groups = new Map<string, GameReport[]>();

  for (const report of reports) {
    const fingerprint = getBuildFingerprint(report.build);
    if (!fingerprint) continue;
    const existing = groups.get(fingerprint) ?? [];
    existing.push(report);
    groups.set(fingerprint, existing);
  }

  let newestGroup: GameReport[] = [];
  let newestTime = 0;
  for (const group of groups.values()) {
    const groupNewestTime = Math.max(...group.map((report) => parseDateValue(report.date)));
    if (groupNewestTime > newestTime) {
      newestTime = groupNewestTime;
      newestGroup = group;
    }
  }

  return [...newestGroup].sort(compareReportsByDate);
}

function selectReleaseEvidence(
  platform: Platform,
  reports: GameReport[],
): ReleaseEvidenceSelection {
  const platformReports = reports.filter((report) => report.platform === platform);
  const releaseLikeReports = platformReports.filter(
    (report) => getActivityTrack(report).affectsRelease,
  );

  const currentBuild = getLatestBuild(platform, "release");
  if (isRenderableBuild(currentBuild)) {
    const matchedReports = releaseLikeReports.filter(
      (report) => reportMatchesCurrentBuild(report, platform).matches,
    );
    return {
      reports: matchedReports,
      buildLabel: getBuildDisplayLabel(currentBuild),
      basis: "Current official release",
      currentBuildKnown: true,
    };
  }

  const explicitReleaseReports = releaseLikeReports.filter(
    (report) =>
      report.build?.channel === "release" &&
      report.build?.official !== false &&
      Boolean(getBuildFingerprint(report.build)),
  );
  if (explicitReleaseReports.length > 0) {
    const latestGroup = selectNewestExplicitReleaseGroup(explicitReleaseReports);
    return {
      reports: latestGroup,
      buildLabel: formatReportBuildLabel(latestGroup[0]?.build ?? null),
      basis: "Latest official release reports",
      currentBuildKnown: false,
    };
  }

  const legacyReleaseReports = releaseLikeReports.filter((report) => !report.build);
  return {
    reports: legacyReleaseReports,
    buildLabel: null,
    basis: "Legacy release-track reports",
    currentBuildKnown: false,
  };
}

function derivePublicStatus(reports: GameReport[]): SummaryStatus {
  if (reports.length === 0) return "untested";

  const bestStatus = reports.reduce<GameReport["status"]>((best, report) => {
    return STATUS_RANK[report.status] > STATUS_RANK[best] ? report.status : best;
  }, "nothing");

  if (bestStatus === "playable" && reports.some((report) => report.status !== "playable")) {
    return "ingame";
  }

  return bestStatus;
}

function buildReleaseNote(
  selection: ReleaseEvidenceSelection,
  publicStatus: SummaryStatus,
  variesByDevice: boolean,
  platformReports: GameReport[],
): string {
  if (selection.reports.length === 0) {
    if (selection.currentBuildKnown) {
      return "No reports yet for the current official release. Preview and self-built reports below do not affect the public verdict.";
    }
    if (platformReports.length > 0) {
      return "Only preview, self-built, or older legacy reports are available right now. The public release verdict stays unverified.";
    }
    return "No reports have been submitted for this platform yet.";
  }

  if (variesByDevice) {
    return "Device results vary on the release track. Playable is reserved for consistent playthrough-quality reports, so mixed outcomes stay conservative.";
  }

  if (publicStatus === "playable") {
    return "Current release reports consistently indicate playthrough-quality results on the reported devices.";
  }

  return "Current release verdict is based only on release-track reports. Preview and self-built activity appears below for context.";
}

function buildReleaseCard(
  platform: Platform,
  reports: GameReport[],
): ReleaseStatusCard {
  const selection = selectReleaseEvidence(platform, reports);
  const platformReports = reports.filter((report) => report.platform === platform);
  const sortedEvidence = [...selection.reports].sort(compareReportsByDate);
  const publicStatus = derivePublicStatus(sortedEvidence);
  const bestObserved =
    sortedEvidence.length > 0
      ? [...sortedEvidence].sort((left, right) => compareReportsByStatus(left, right, "best"))[0]
      : null;
  const worstObserved =
    sortedEvidence.length > 0
      ? [...sortedEvidence].sort((left, right) => compareReportsByStatus(left, right, "worst"))[0]
      : null;
  const statusSet = new Set(sortedEvidence.map((report) => report.status));
  const variesByDevice = statusSet.size > 1;
  const latestReportDate = sortedEvidence[0]?.date ?? null;
  const perf = derivePublicPerf(sortedEvidence, publicStatus);

  return {
    platform,
    status: publicStatus,
    perf,
    verified: sortedEvidence.length > 0,
    latestReportDate,
    buildLabel: selection.buildLabel,
    reportCount: sortedEvidence.length,
    basis: selection.basis,
    variesByDevice,
    note: buildReleaseNote(selection, publicStatus, variesByDevice, platformReports),
    bestObserved,
    worstObserved,
    evidenceKeys: sortedEvidence.map((report) => reportIdentity(report)),
  };
}

function derivePublicPerf(
  reports: GameReport[],
  status: SummaryStatus,
): PerfTier {
  if (reports.length === 0 || status === "untested" || status === "nothing") {
    return "n/a";
  }

  const candidates = reports
    .map((report) => report.perf)
    .filter((perf): perf is PerfTier => Boolean(perf) && perf !== "n/a");

  if (candidates.includes("poor")) return "poor";
  if (candidates.includes("ok")) return "ok";
  if (candidates.includes("great")) return "great";
  return "n/a";
}

function selectPlatformsForCards(game: Game, reports: GameReport[]): Platform[] {
  const fromReports = (["ios", "macos"] as const).filter((platform) =>
    reports.some((report) => report.platform === platform),
  );

  if (fromReports.length > 0) {
    return [...fromReports];
  }

  const fallback = game.platforms.filter(
    (platform): platform is Platform => platform === "ios" || platform === "macos",
  );
  return fallback.length > 0 ? fallback : ["ios"];
}

export function selectPrimaryReleaseCard(
  cards: ReleaseStatusCard[],
): ReleaseStatusCard | null {
  if (cards.length === 0) return null;

  const priority = (card: ReleaseStatusCard): number => {
    let score = 0;
    if (card.platform === "ios") score += 100;
    if (card.verified) score += 10;
    if (card.variesByDevice) score -= 1;
    return score;
  };

  return [...cards].sort((left, right) => priority(right) - priority(left))[0] ?? null;
}

function buildCompatibilityListEntry(
  game: Game,
  reports: GameReport[],
  hiddenReportCount: number,
): CompatibilityListEntry {
  const releaseCards = selectPlatformsForCards(game, reports).map((platform) =>
    buildReleaseCard(platform, reports),
  );
  const platformEntries = releaseCards.map((card) => {
    const evidence = selectReleaseEvidence(card.platform, reports).reports;
    return {
      platform: card.platform,
      status: card.status,
      perf: card.perf,
      updatedAt: card.latestReportDate ?? "",
      observedDevices: [...new Set(evidence.map((report) => report.device))],
      variesByDevice: card.variesByDevice,
      verified: card.verified,
    } satisfies CompatibilityPlatformEntry;
  });
  const primaryCard = selectPrimaryReleaseCard(releaseCards);
  const primaryEvidence = primaryCard
    ? selectReleaseEvidence(primaryCard.platform, reports).reports
    : [];
  const observedDevices = [...new Set(primaryEvidence.map((report) => report.device))];

  return {
    game,
    platform: primaryCard?.platform ?? null,
    status: primaryCard?.status ?? "untested",
    perf: primaryCard?.perf ?? "n/a",
    updatedAt: primaryCard?.latestReportDate ?? "",
    latestActivityDate: reports[0]?.date ?? null,
    deviceLabel: primaryCard?.variesByDevice
      ? "Varies by device"
      : primaryCard?.bestObserved?.device ?? "Unverified",
    observedDevices,
    variesByDevice: primaryCard?.variesByDevice ?? false,
    hiddenReportCount,
    platformEntries,
  };
}

async function fetchLiveGameDetail(titleId: string): Promise<LiveGameDetailResponse | null> {
  try {
    const response = await fetch(
      `https://xenios-compat-api.xenios.workers.dev/games/${titleId}/discussion`,
      { next: { revalidate: 60 } },
    );
    if (!response.ok) return null;
    return (await response.json()) as LiveGameDetailResponse;
  } catch {
    return null;
  }
}

async function fetchLiveGames(): Promise<Game[] | null> {
  try {
    const response = await fetch("https://xenios-compat-api.xenios.workers.dev/games", {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return normalizeGames((await response.json()) as LiveGamesResponse);
  } catch {
    return null;
  }
}

export const getCompatibilityGames = cache(async (): Promise<Game[]> => {
  const fallbackGames = getAllGames();
  const liveGames = await fetchLiveGames();

  if (!liveGames || liveGames.length === 0) {
    return fallbackGames;
  }

  const mergedGames = new Map<string, Game>();
  fallbackGames.forEach((game) => {
    mergedGames.set(game.slug, game);
  });
  liveGames.forEach((game) => {
    mergedGames.set(game.slug, game);
  });

  return [...mergedGames.values()];
});

export async function getCompatibilityGameBySlug(
  slug: string,
): Promise<Game | undefined> {
  const games = await getCompatibilityGames();
  return games.find((game) => game.slug === slug);
}

export async function getGameDetailViewModel(
  game: Game,
): Promise<GameDetailViewModel> {
  const liveDetail = await fetchLiveGameDetail(game.titleId);
  const discussion = getDiscussionByTitleId(game.titleId);
  const liveReports = normalizeLiveReports(liveDetail?.reports);
  const allReports =
    liveReports.length > 0 ? liveReports : [...game.reports].sort(compareReportsByDate);
  const { valid: reports, hidden } = partitionReportsByMetadata(allReports);

  const platforms = selectPlatformsForCards(game, reports);

  const releaseCards = platforms.map((platform) => buildReleaseCard(platform, reports));
  const currentReleaseEvidenceKeys = new Set(
    releaseCards.flatMap((card) => card.evidenceKeys),
  );
  const matchedDiscussionIds = new Set<string>();

  const reportActivity = reports.map((report) => {
    const track = getActivityTrack(report);
    const id = reportIdentity(report);
    const matchedDiscussionEntry = (discussion?.entries ?? []).find((entry) => {
      if (matchedDiscussionIds.has(entry.id)) return false;
      if (!discussionMatchesReport(entry, report)) return false;
      matchedDiscussionIds.add(entry.id);
      return true;
    });
    return {
      id,
      date: report.date,
      dateMs: parseDateValue(report.date),
      kind: "report",
      report,
      discussionEntry: matchedDiscussionEntry,
      track: track.track,
      trackLabel: track.trackLabel,
      sourceLabel: getSourceLabel(report.source),
      buildLabel: formatReportBuildLabel(report.build ?? null),
      isCurrentReleaseEvidence: currentReleaseEvidenceKeys.has(id),
    } satisfies ReportActivityItem;
  });

  const discussionActivity = (discussion?.entries ?? [])
    .filter((entry) => !matchedDiscussionIds.has(entry.id))
    .map((entry) => {
    return {
      id: `discussion-${entry.id}`,
      date: entry.createdAt,
      dateMs: entry.createdAtMs || parseDateValue(entry.createdAt),
      kind: "discussion",
      entry,
      track: "discussion",
      trackLabel: entry.type === "issue" ? "GitHub Issue" : "GitHub Comment",
      sourceLabel: "GitHub",
      buildLabel: null,
      isCurrentReleaseEvidence: false,
    } satisfies DiscussionActivityItem;
  });

  const activity = [...reportActivity, ...discussionActivity].sort(compareActivityByDate);

  return {
    issueNumber:
      typeof liveDetail?.issueNumber === "number"
        ? liveDetail.issueNumber
        : discussion?.issueNumber ?? game.issueNumber,
    issueUrl:
      typeof liveDetail?.issueUrl === "string" && liveDetail.issueUrl.trim().length > 0
        ? liveDetail.issueUrl
        : discussion?.issueUrl ?? game.issueUrl,
    latestActivityDate: activity[0]?.date ?? null,
    totalReportCount: reports.length + hidden.length,
    hiddenReportCount: hidden.length,
    releaseCards,
    activity,
  };
}

export async function getCompatibilityListEntries(): Promise<CompatibilityListEntry[]> {
  const games = await getCompatibilityGames();

  return games
    .map((game) => {
      const sortedReports = [...game.reports].sort(compareReportsByDate);
      const { valid, hidden } = partitionReportsByMetadata(sortedReports);
      return buildCompatibilityListEntry(game, valid, hidden.length);
    })
    .sort((left, right) => {
      const leftTime = parseDateValue(left.updatedAt);
      const rightTime = parseDateValue(right.updatedAt);
      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }
      return left.game.title.localeCompare(right.game.title);
    });
}
