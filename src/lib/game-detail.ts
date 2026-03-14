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
import {
  ALPHA_BUCKETS,
  CATALOG_BUCKETS,
  alphaBucketForTitle,
  parseCompatibilityBrowseFilters,
  type AlphaBucket,
  type CatalogBucket,
  type CompatibilityBrowseFilters,
  type PlatformFilter,
} from "@/lib/compatibility-browse";
import {
  getAllDiscussions,
  getDiscussionByTitleIds,
  type DiscussionData,
  type DiscussionEntry,
} from "@/lib/discussions";
import { matchesPublishedReleaseBuild } from "@/lib/release-build-match";

const STATUS_RANK: Record<GameReport["status"], number> = {
  nothing: 0,
  loads: 1,
  intro: 2,
  ingame: 3,
  playable: 4,
};

const SUMMARY_STATUS_RANK: Record<SummaryStatus, number> = {
  untested: -1,
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

export interface CompatibilityListGame {
  slug: string;
  title: string;
  titleId: string;
  titleIds: string[];
  tags: string[];
}

export interface CompatibilityListEntry {
  game: CompatibilityListGame;
  platform: Platform | null;
  status: SummaryStatus;
  perf: PerfTier;
  updatedAt: string;
  latestActivityDate: string | null;
  hasHistory: boolean;
  historyPlatforms: Platform[];
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

export interface CompatibilityDeviceGroup {
  label: string;
  rawValues: string[];
}

export interface CompatibilityAlphaCount {
  bucket: AlphaBucket;
  count: number;
}

export interface CompatibilityCatalogOverview {
  totalTracked: number;
  testedCount: number;
  totalHiddenReports: number;
  bucketCounts: CompatibilityAlphaCount[];
}

export interface CompatibilityStatusSummary {
  total: number;
  statusCounts: Record<SummaryStatus, number>;
}

export interface CompatibilityStatusSummaryByPlatform {
  all: CompatibilityStatusSummary;
  ios: CompatibilityStatusSummary;
  macos: CompatibilityStatusSummary;
}

export interface CompatibilityCatalogPageData {
  entries: CompatibilityListEntry[];
  totalEntries: number;
  page: number;
  pageCount: number;
  summaryByPlatform: CompatibilityStatusSummaryByPlatform;
}

export interface CompatibilityListPageData {
  filters: CompatibilityBrowseFilters;
  entries: CompatibilityListEntry[];
  totalTracked: number;
  testedCount: number;
  baseTotal: number;
  filteredTotal: number;
  totalHiddenReports: number;
  statusCounts: Record<SummaryStatus, number>;
  deviceGroups: CompatibilityDeviceGroup[];
  alphaCounts: CompatibilityAlphaCount[];
  page: number;
  pageCount: number;
  pageSize: number;
}

export const COMPATIBILITY_CATALOG_PAGE_SIZE = 50;

interface CompatibilityObservation {
  status: SummaryStatus;
  perf: PerfTier;
  date: string;
  device: string | null;
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
  if (!reportBuild) {
    return {
      matches: false,
      buildLabel: getBuildDisplayLabel(currentBuild),
    };
  }

  return {
    matches: matchesPublishedReleaseBuild(reportBuild, currentBuild),
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
  if (
    (report.build?.channel === "self-built" || report.build?.official === false) &&
    reportMatchesCurrentBuild(report, report.platform).matches
  ) {
    return { track: "release", trackLabel: "Release Match", affectsRelease: true };
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

function normalizeDiscussionStatus(value?: string | null): SummaryStatus | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (
    normalized === "playable" ||
    normalized === "ingame" ||
    normalized === "intro" ||
    normalized === "loads" ||
    normalized === "nothing" ||
    normalized === "untested"
  ) {
    return normalized;
  }
  return null;
}

function normalizeDiscussionPerf(value?: string | null): PerfTier | null {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "great" ||
    normalized === "ok" ||
    normalized === "poor" ||
    normalized === "n/a"
  ) {
    return normalized;
  }
  return null;
}

function compareObservationsByDate(
  left: CompatibilityObservation,
  right: CompatibilityObservation,
): number {
  const byDate = parseDateValue(right.date) - parseDateValue(left.date);
  if (byDate !== 0) return byDate;
  return SUMMARY_STATUS_RANK[right.status] - SUMMARY_STATUS_RANK[left.status];
}

function deriveHistoryStatus(observations: CompatibilityObservation[]): SummaryStatus {
  if (observations.length === 0) return "untested";

  const bestStatus = observations.reduce<SummaryStatus>((best, observation) => {
    return SUMMARY_STATUS_RANK[observation.status] > SUMMARY_STATUS_RANK[best]
      ? observation.status
      : best;
  }, "untested");

  if (
    bestStatus === "playable" &&
    observations.some(
      (observation) =>
        observation.status !== "playable" && observation.status !== "untested",
    )
  ) {
    return "ingame";
  }

  return bestStatus;
}

function deriveHistoryPerf(
  observations: CompatibilityObservation[],
  status: SummaryStatus,
): PerfTier {
  if (observations.length === 0 || status === "untested" || status === "nothing") {
    return "n/a";
  }

  const candidates = observations
    .map((observation) => observation.perf)
    .filter((perf): perf is PerfTier => Boolean(perf) && perf !== "n/a");

  if (candidates.includes("poor")) return "poor";
  if (candidates.includes("ok")) return "ok";
  if (candidates.includes("great")) return "great";
  return "n/a";
}

function buildReportObservations(reports: GameReport[]): CompatibilityObservation[] {
  return [...reports]
    .sort(compareReportsByDate)
    .map((report) => ({
      status: report.status,
      perf: report.perf ?? "n/a",
      date: report.date,
      device: report.device,
    }));
}

function buildDiscussionObservations(entries: DiscussionEntry[]): CompatibilityObservation[] {
  return entries
    .map((entry) => {
      const status = normalizeDiscussionStatus(entry.meta.status);
      if (!status) return null;
      return {
        status,
        perf: normalizeDiscussionPerf(entry.meta.perf) ?? "n/a",
        date: entry.createdAt,
        device: entry.meta.device?.trim() || null,
      } satisfies CompatibilityObservation;
    })
    .filter((entry): entry is CompatibilityObservation => Boolean(entry))
    .sort(compareObservationsByDate);
}

function sortPlatforms(platforms: Iterable<Platform>): Platform[] {
  const ordered: Platform[] = [];
  for (const platform of ["ios", "macos"] as const) {
    if ([...platforms].includes(platform)) {
      ordered.push(platform);
    }
  }
  return ordered;
}

function latestDiscussionDate(discussion: DiscussionData | null): string | null {
  if (!discussion) return null;

  const dates = [
    discussion.updatedAt,
    ...discussion.entries.map((entry) => entry.createdAt),
  ].filter(Boolean);
  if (dates.length === 0) return null;

  return [...dates].sort((left, right) => parseDateValue(right) - parseDateValue(left))[0] ?? null;
}

function buildHistoryPlatformEntry(
  platform: Platform,
  reports: GameReport[],
  discussionEntries: DiscussionEntry[],
): CompatibilityPlatformEntry | null {
  const platformReports = reports.filter((report) => report.platform === platform);
  const platformDiscussionEntries = discussionEntries.filter(
    (entry) => normalizeDiscussionPlatform(entry.meta.platform) === platform,
  );
  if (platformReports.length === 0 && platformDiscussionEntries.length === 0) {
    return null;
  }

  const reportObservations = buildReportObservations(platformReports);
  const discussionObservations = buildDiscussionObservations(platformDiscussionEntries);
  const observations =
    reportObservations.length > 0 ? reportObservations : discussionObservations;
  const status = deriveHistoryStatus(observations);
  const updatedAt =
    observations[0]?.date ??
    [...platformDiscussionEntries]
      .sort((left, right) => parseDateValue(right.createdAt) - parseDateValue(left.createdAt))[0]
      ?.createdAt ??
    "";
  const observedDevicesSource =
    observations.length > 0
      ? observations
      : [...platformDiscussionEntries]
          .sort((left, right) => parseDateValue(right.createdAt) - parseDateValue(left.createdAt))
          .map((entry) => ({
            device: entry.meta.device?.trim() || null,
          }));
  const observedDevices = [
    ...new Set(
      observedDevicesSource
        .map((observation) => observation.device)
        .filter((device): device is string => Boolean(device)),
    ),
  ];
  const variesByDevice =
    new Set(
      observations
        .map((observation) => observation.status)
        .filter((candidate) => candidate !== "untested"),
    ).size > 1;

  return {
    platform,
    status,
    perf: deriveHistoryPerf(observations, status),
    updatedAt,
    observedDevices,
    variesByDevice,
    verified: platformReports.length > 0,
  };
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

function selectPlatformsForListEntry(
  game: Game,
  reports: GameReport[],
  discussionEntries: DiscussionEntry[],
): Platform[] {
  const platforms = new Set<Platform>();

  for (const report of reports) {
    platforms.add(report.platform);
  }

  for (const entry of discussionEntries) {
    const platform = normalizeDiscussionPlatform(entry.meta.platform);
    if (platform) {
      platforms.add(platform);
    }
  }

  for (const platform of game.platforms) {
    if (platform === "ios" || platform === "macos") {
      platforms.add(platform);
    }
  }

  const ordered = sortPlatforms(platforms);
  return ordered.length > 0 ? ordered : ["ios"];
}

function selectPrimaryListPlatformEntry(
  entries: CompatibilityPlatformEntry[],
): CompatibilityPlatformEntry | null {
  if (entries.length === 0) return null;

  const priority = (entry: CompatibilityPlatformEntry): number => {
    let score = 0;
    if (entry.platform === "ios") score += 100;
    if (entry.verified) score += 10;
    if (entry.variesByDevice) score -= 1;
    return score;
  };

  return [...entries].sort((left, right) => priority(right) - priority(left))[0] ?? null;
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
      return "No reports yet for the current official release. Preview, self-built, and non-matching local reports below do not affect the public verdict.";
    }
    if (platformReports.length > 0) {
      return "Only preview, non-matching local, or older legacy reports are available right now. There is not enough matched evidence for the published release yet.";
    }
    return "No reports have been submitted for this platform yet.";
  }

  if (variesByDevice) {
    return "Device results vary on the release track. Playable is reserved for consistent playthrough-quality reports, so mixed outcomes stay conservative.";
  }

  if (publicStatus === "playable") {
    return "Current release reports consistently indicate playthrough-quality results on the reported devices.";
  }

  return "Current release verdict is based on the current published release. Preview, self-built, and non-matching local activity appears below for context.";
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
  const discussion = getDiscussionByTitleIds(game.titleIds);
  const discussionEntries = discussion?.entries ?? [];
  const platformEntries = selectPlatformsForListEntry(game, reports, discussionEntries)
    .map((platform) => buildHistoryPlatformEntry(platform, reports, discussionEntries))
    .filter((entry): entry is CompatibilityPlatformEntry => Boolean(entry));
  const primaryPlatformEntry = selectPrimaryListPlatformEntry(platformEntries);
  const latestActivityDate = [reports[0]?.date ?? null, latestDiscussionDate(discussion)]
    .filter(Boolean)
    .sort((left, right) => parseDateValue(right) - parseDateValue(left))[0] ?? null;
  const historyPlatforms = sortPlatforms(platformEntries.map((entry) => entry.platform));
  const observedDevices = primaryPlatformEntry?.observedDevices ?? [];

  return {
    game: {
      slug: game.slug,
      title: game.title,
      titleId: game.titleId,
      titleIds: game.titleIds,
      tags: game.tags,
    },
    platform: primaryPlatformEntry?.platform ?? null,
    status: primaryPlatformEntry?.status ?? "untested",
    perf: primaryPlatformEntry?.perf ?? "n/a",
    updatedAt: primaryPlatformEntry?.updatedAt ?? latestActivityDate ?? "",
    latestActivityDate,
    hasHistory: reports.length > 0 || discussionEntries.length > 0,
    historyPlatforms,
    deviceLabel: primaryPlatformEntry?.variesByDevice
      ? "Varies by device"
      : observedDevices[0] ?? "Unverified",
    observedDevices,
    variesByDevice: primaryPlatformEntry?.variesByDevice ?? false,
    hiddenReportCount,
    platformEntries,
  };
}

function getListEntryProjection(
  entry: CompatibilityListEntry,
  platform: PlatformFilter,
): {
  platform: Platform | null;
  status: SummaryStatus;
  perf: PerfTier;
  updatedAt: string;
  observedDevices: string[];
  variesByDevice: boolean;
} {
  if (platform === "all") {
    return {
      platform: entry.platform,
      status: entry.status,
      perf: entry.perf,
      updatedAt: entry.updatedAt,
      observedDevices: entry.observedDevices,
      variesByDevice: entry.variesByDevice,
    };
  }

  const platformEntry =
    entry.platformEntries.find((candidate) => candidate.platform === platform) ?? null;

  if (!platformEntry) {
    return {
      platform,
      status: "untested",
      perf: "n/a",
      updatedAt: "",
      observedDevices: [],
      variesByDevice: false,
    };
  }

  return {
    platform: platformEntry.platform,
    status: platformEntry.status,
    perf: platformEntry.perf,
    updatedAt: platformEntry.updatedAt,
    observedDevices: platformEntry.observedDevices,
    variesByDevice: platformEntry.variesByDevice,
  };
}

function isTestedListEntry(entry: CompatibilityListEntry, platform: PlatformFilter): boolean {
  if (!entry.hasHistory) {
    return false;
  }

  if (platform === "all") {
    return true;
  }

  return entry.historyPlatforms.includes(platform);
}

function emptyStatusCounts(): Record<SummaryStatus, number> {
  return {
    playable: 0,
    ingame: 0,
    intro: 0,
    loads: 0,
    nothing: 0,
    untested: 0,
  };
}

function buildStatusSummary(
  entries: CompatibilityListEntry[],
  platform: PlatformFilter,
): CompatibilityStatusSummary {
  const statusCounts = emptyStatusCounts();

  for (const entry of entries) {
    const projection = getListEntryProjection(entry, platform);
    statusCounts[projection.status] += 1;
  }

  return {
    total: entries.length,
    statusCounts,
  };
}

function buildStatusSummaryByPlatform(
  entries: CompatibilityListEntry[],
): CompatibilityStatusSummaryByPlatform {
  return {
    all: buildStatusSummary(entries, "all"),
    ios: buildStatusSummary(entries, "ios"),
    macos: buildStatusSummary(entries, "macos"),
  };
}

function sortCompatibilityEntries(
  entries: CompatibilityListEntry[],
  platform: PlatformFilter,
  sort: CompatibilityBrowseFilters["sort"],
): CompatibilityListEntry[] {
  const sorted = [...entries];
  if (sort === "alpha") {
    sorted.sort((left, right) => left.game.title.localeCompare(right.game.title));
    return sorted;
  }

  sorted.sort((left, right) => {
    const rightProjection = getListEntryProjection(right, platform);
    const leftProjection = getListEntryProjection(left, platform);
    const dateDelta =
      parseDateValue(rightProjection.updatedAt) - parseDateValue(leftProjection.updatedAt);
    if (dateDelta !== 0) {
      return dateDelta;
    }
    return left.game.title.localeCompare(right.game.title);
  });
  return sorted;
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

async function fetchGitHubIssueTitle(issueNumber: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/xenios-jp/game-compatibility/issues/${issueNumber}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "xenios-website-compatibility",
        },
        next: { revalidate: 60 },
      },
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as { title?: unknown };
    return typeof payload.title === "string" && payload.title.trim().length > 0
      ? payload.title.trim()
      : null;
  } catch {
    return null;
  }
}

const GENERIC_GAME_TITLE_PATTERN = /^Title [A-F0-9]{8}$/i;
const ISSUE_TITLE_ID_PREFIX_PATTERN = /^\[?[A-F0-9]{8}\]?\s*(?:—|-)\s*/i;
const WRAPPED_GAME_TITLE_PATTERN = /^\[(.+)\]([™®©])?$/u;

function isGenericGameTitle(title?: string | null): boolean {
  if (!title) return true;
  return title === "Unknown Title" || GENERIC_GAME_TITLE_PATTERN.test(title.trim());
}

function normalizeWrappedGameTitle(title: string): string {
  const wrappedMatch = title.match(WRAPPED_GAME_TITLE_PATTERN);
  if (!wrappedMatch) {
    return title;
  }

  const innerTitle = wrappedMatch[1]?.trim();
  const suffix = wrappedMatch[2] ?? "";
  return innerTitle ? `${innerTitle}${suffix}` : title;
}

function parseGameTitleFromIssueTitle(issueTitle: string): string | null {
  const cleaned = normalizeWrappedGameTitle(
    issueTitle
      .trim()
      .replace(ISSUE_TITLE_ID_PREFIX_PATTERN, "")
      .replace(/^\[?[A-F0-9]{8}\]?\s*/i, "")
      .trim(),
  );

  return cleaned.length > 0 ? cleaned : null;
}

function slugifySyntheticGameTitle(title: string, titleId: string): string {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || `title-${titleId.toLowerCase()}`;
}

function mergeUniqueValues<T extends string>(...lists: Array<readonly T[] | undefined>): T[] {
  const seen = new Set<T>();
  const merged: T[] = [];

  for (const list of lists) {
    for (const value of list ?? []) {
      if (!value || seen.has(value)) continue;
      seen.add(value);
      merged.push(value);
    }
  }

  return merged;
}

function getGamePrimaryTitleId(game: Pick<Game, "titleId">): string | null {
  return game.titleId && game.titleId !== "UNKNOWN" ? game.titleId : null;
}

function getGameKnownTitleIds(game: Pick<Game, "titleId" | "titleIds">): string[] {
  return mergeUniqueValues(
    game.titleIds.filter((titleId) => titleId !== "UNKNOWN"),
    getGamePrimaryTitleId(game) ? [getGamePrimaryTitleId(game)!] : [],
  );
}

function dedupeReports(reports: GameReport[]): GameReport[] {
  const deduped = new Map<string, GameReport>();

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

function chooseCanonicalGame(existing: Game, incoming: Game): Game {
  if (isGenericGameTitle(existing.title) && !isGenericGameTitle(incoming.title)) {
    return incoming;
  }
  if (!existing.slug && incoming.slug) {
    return incoming;
  }
  return existing;
}

function mergeCompatibilityGames(existing: Game, incoming: Game): Game {
  const canonical = chooseCanonicalGame(existing, incoming);
  const mergedReports = dedupeReports([...existing.reports, ...incoming.reports]);
  const mergedTitleIds = mergeUniqueValues(
    existing.titleIds.filter((titleId) => titleId !== "UNKNOWN"),
    incoming.titleIds.filter((titleId) => titleId !== "UNKNOWN"),
    getGamePrimaryTitleId(existing) ? [getGamePrimaryTitleId(existing)!] : [],
    getGamePrimaryTitleId(incoming) ? [getGamePrimaryTitleId(incoming)!] : [],
  );
  const mergedScreenshots = mergeUniqueValues(
    existing.screenshots,
    incoming.screenshots,
    ...mergedReports.map((report) => report.screenshots ?? []),
  );
  const mergedPlatforms = mergeUniqueValues(
    existing.platforms,
    incoming.platforms,
    mergedReports.map((report) => report.platform),
  );
  const metadataSource =
    parseDateValue(incoming.updatedAt) > parseDateValue(existing.updatedAt) ? incoming : existing;

  const mergedRecord: Record<string, unknown> = {
    slug: canonical.slug || existing.slug || incoming.slug,
    title: canonical.title || existing.title || incoming.title,
    titleId:
      (canonical.titleId && canonical.titleId !== "UNKNOWN"
        ? canonical.titleId
        : mergedTitleIds[0]) ?? "UNKNOWN",
    titleIds: mergedTitleIds,
    tags: mergeUniqueValues(existing.tags, incoming.tags),
    issueNumber: canonical.issueNumber ?? existing.issueNumber ?? incoming.issueNumber,
    issueUrl: canonical.issueUrl ?? existing.issueUrl ?? incoming.issueUrl,
    reports: mergedReports,
    screenshots: mergedScreenshots,
    platforms: mergedPlatforms,
  };

  if (mergedReports.length === 0) {
    mergedRecord.status = metadataSource.status;
    mergedRecord.perf = metadataSource.perf;
    mergedRecord.updatedAt = metadataSource.updatedAt;
    mergedRecord.notes = metadataSource.notes;
    mergedRecord.lastReport = metadataSource.lastReport;
    mergedRecord.summaries = metadataSource.summaries;
  }

  return normalizeGames([mergedRecord])[0] ?? canonical;
}

async function reconcileDiscussionAliases(games: Game[]): Promise<Game[]> {
  const reconciledGames = [...games];
  const knownTitleIds = new Set(
    reconciledGames.flatMap((game) =>
      mergeUniqueValues(game.titleIds, getGamePrimaryTitleId(game) ? [getGamePrimaryTitleId(game)!] : []),
    ),
  );
  const titleIndex = new Map<string, Game[]>();

  for (const game of reconciledGames) {
    const titleKey = normalizeComparableText(game.title);
    if (!titleKey) continue;
    const existing = titleIndex.get(titleKey) ?? [];
    existing.push(game);
    titleIndex.set(titleKey, existing);
  }

  const unresolvedDiscussions = getAllDiscussions().filter(
    (discussion) => !knownTitleIds.has(discussion.titleId),
  );
  if (unresolvedDiscussions.length === 0) {
    return reconciledGames;
  }

  for (const discussion of unresolvedDiscussions) {
    const issueTitle = await fetchGitHubIssueTitle(discussion.issueNumber);
    const inferredTitle = issueTitle ? parseGameTitleFromIssueTitle(issueTitle) : null;
    const titleMatches = inferredTitle
      ? titleIndex.get(normalizeComparableText(inferredTitle)) ?? []
      : [];

    if (titleMatches.length === 1) {
      const target = titleMatches[0]!;
      target.titleIds = mergeUniqueValues(target.titleIds, [discussion.titleId]);
      knownTitleIds.add(discussion.titleId);
      continue;
    }

    const syntheticTitle = inferredTitle ?? `Title ${discussion.titleId}`;
    let syntheticSlug = slugifySyntheticGameTitle(syntheticTitle, discussion.titleId);
    if (reconciledGames.some((game) => game.slug === syntheticSlug)) {
      syntheticSlug = `${syntheticSlug}-${discussion.titleId.toLowerCase()}`;
    }

    const syntheticGame =
      normalizeGames([
        {
          slug: syntheticSlug,
          title: syntheticTitle,
          titleId: discussion.titleId,
          titleIds: [discussion.titleId],
          issueNumber: discussion.issueNumber,
          issueUrl: discussion.issueUrl,
          updatedAt: discussion.updatedAt,
          notes: discussion.entries[0]?.excerpt ?? "",
          reports: [],
          screenshots: mergeUniqueValues(...discussion.entries.map((entry) => entry.images ?? [])),
          platforms: [],
          tags: [],
        },
      ])[0] ?? null;

    if (!syntheticGame) {
      continue;
    }

    reconciledGames.push(syntheticGame);
    knownTitleIds.add(discussion.titleId);

    const titleKey = normalizeComparableText(syntheticGame.title);
    if (!titleKey) continue;
    const existing = titleIndex.get(titleKey) ?? [];
    existing.push(syntheticGame);
    titleIndex.set(titleKey, existing);
  }

  return reconciledGames;
}

export const getCompatibilityGames = cache(async (): Promise<Game[]> => {
  const fallbackGames = getAllGames();
  const liveGames = await fetchLiveGames();

  if (!liveGames || liveGames.length === 0) {
    return fallbackGames;
  }

  const mergedGames = new Map<string, Game>();
  const titleIdToGameKey = new Map<string, string>();
  let unknownKeyCounter = 0;

  const registerGameAliases = (gameKey: string, game: Game) => {
    for (const titleId of getGameKnownTitleIds(game)) {
      if (!titleIdToGameKey.has(titleId)) {
        titleIdToGameKey.set(titleId, gameKey);
      }
    }
  };

  const allocateGameKey = (game: Game) => {
    return getGamePrimaryTitleId(game) ?? game.slug ?? `unknown-${unknownKeyCounter++}`;
  };

  const findExistingGameKey = (game: Game): string | null => {
    const primaryTitleId = getGamePrimaryTitleId(game);
    if (primaryTitleId) {
      const existingKey = titleIdToGameKey.get(primaryTitleId);
      if (existingKey) return existingKey;
    }
    return null;
  };

  const insertFallbackGame = (game: Game) => {
    const newKey = allocateGameKey(game);
    mergedGames.set(newKey, game);
    registerGameAliases(newKey, game);
  };

  const upsertLiveGame = (game: Game) => {
    const existingKey = findExistingGameKey(game);
    if (!existingKey) {
      const newKey = allocateGameKey(game);
      mergedGames.set(newKey, game);
      registerGameAliases(newKey, game);
      return;
    }

    const existingGame = mergedGames.get(existingKey);
    if (!existingGame) return;

    const mergedGame = mergeCompatibilityGames(existingGame, game);
    mergedGames.set(existingKey, mergedGame);
    registerGameAliases(existingKey, mergedGame);
  };

  fallbackGames.forEach(insertFallbackGame);
  liveGames.forEach(upsertLiveGame);

  return reconcileDiscussionAliases([...mergedGames.values()]);
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
  const discussion = getDiscussionByTitleIds(game.titleIds);
  const liveReports = normalizeLiveReports(liveDetail?.reports);
  const allReports = dedupeReports([...game.reports, ...liveReports]).sort(compareReportsByDate);
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

export const getCompatibilityListEntries = cache(
  async (): Promise<CompatibilityListEntry[]> => {
    const games = await getCompatibilityGames();

    return games
      .map((game) => {
        const sortedReports = [...game.reports].sort(compareReportsByDate);
        const { valid, hidden } = partitionReportsByMetadata(sortedReports);
        return buildCompatibilityListEntry(game, valid, hidden.length);
      })
      .sort((left, right) => {
        const leftTime = parseDateValue(left.latestActivityDate ?? left.updatedAt);
        const rightTime = parseDateValue(right.latestActivityDate ?? right.updatedAt);
        if (leftTime !== rightTime) {
          return rightTime - leftTime;
        }
        return left.game.title.localeCompare(right.game.title);
      });
  },
);

export const getTestedCompatibilityListEntries = cache(
  async (): Promise<CompatibilityListEntry[]> => {
    const entries = await getCompatibilityListEntries();
    return entries.filter((entry) => isTestedListEntry(entry, "all"));
  },
);

export const getCompatibilityCatalogOverview = cache(
  async (): Promise<CompatibilityCatalogOverview> => {
    const entries = await getCompatibilityListEntries();

    return {
      totalTracked: entries.length,
      testedCount: entries.filter((entry) => isTestedListEntry(entry, "all")).length,
      totalHiddenReports: entries.reduce((sum, entry) => sum + entry.hiddenReportCount, 0),
      bucketCounts: CATALOG_BUCKETS.map((bucket) => ({
        bucket,
        count: entries.filter((entry) => alphaBucketForTitle(entry.game.title) === bucket).length,
      })),
    };
  },
);

export const getFullCompatibilityCatalogEntries = cache(
  async (): Promise<CompatibilityListEntry[]> => {
    const entries = await getCompatibilityListEntries();
    return sortCompatibilityEntries(entries, "all", "alpha");
  },
);

export async function getCompatibilityCatalogBucketEntries(
  bucket: CatalogBucket,
): Promise<CompatibilityListEntry[]> {
  const entries = await getFullCompatibilityCatalogEntries();
  return entries.filter((entry) => alphaBucketForTitle(entry.game.title) === bucket);
}

export async function getCompatibilityCatalogPageData(
  bucket: CatalogBucket | null,
  requestedPage: number,
): Promise<CompatibilityCatalogPageData> {
  const entries = bucket
    ? await getCompatibilityCatalogBucketEntries(bucket)
    : await getFullCompatibilityCatalogEntries();

  const pageCount = Math.max(1, Math.ceil(entries.length / COMPATIBILITY_CATALOG_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * COMPATIBILITY_CATALOG_PAGE_SIZE;

  return {
    entries: entries.slice(start, start + COMPATIBILITY_CATALOG_PAGE_SIZE),
    totalEntries: entries.length,
    page,
    pageCount,
    summaryByPlatform: buildStatusSummaryByPlatform(entries),
  };
}

export async function getCompatibilityListPageData(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<CompatibilityListPageData> {
  const filters = parseCompatibilityBrowseFilters(searchParams);
  const rawSort = Array.isArray(searchParams.sort)
    ? searchParams.sort[0]
    : searchParams.sort;
  if (filters.scope === "all" && !rawSort) {
    filters.sort = "alpha";
  }
  const allEntries = await getCompatibilityListEntries();
  const totalTracked = allEntries.length;
  const testedCount = allEntries.filter((entry) =>
    isTestedListEntry(entry, filters.platform),
  ).length;
  const totalHiddenReports = allEntries.reduce(
    (sum, entry) => sum + entry.hiddenReportCount,
    0,
  );
  const pageSize =
    filters.scope === "all" ? COMPATIBILITY_CATALOG_PAGE_SIZE : 100;

  const scopedEntries =
    filters.scope === "all"
      ? allEntries
      : allEntries.filter((entry) => isTestedListEntry(entry, filters.platform));

  const alphaCounts = ALPHA_BUCKETS.map((bucket) => ({
    bucket,
    count:
      bucket === "all"
        ? scopedEntries.length
        : scopedEntries.filter((entry) => alphaBucketForTitle(entry.game.title) === bucket).length,
  }));

  const bucketEntries =
    filters.bucket === "all"
      ? scopedEntries
      : scopedEntries.filter(
          (entry) => alphaBucketForTitle(entry.game.title) === filters.bucket,
        );

  const searchedEntries = filters.q
    ? bucketEntries.filter((entry) => {
        const query = filters.q.toLowerCase();
        return (
          entry.game.title.toLowerCase().includes(query) ||
          entry.game.titleIds.some((titleId) => titleId.toLowerCase().includes(query)) ||
          entry.game.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      })
    : bucketEntries;

  const baseEntries = searchedEntries;

  const statusCounts: Record<SummaryStatus, number> = {
    playable: 0,
    ingame: 0,
    intro: 0,
    loads: 0,
    nothing: 0,
    untested: 0,
  };
  for (const entry of baseEntries) {
    const projection = getListEntryProjection(entry, filters.platform);
    statusCounts[projection.status] += 1;
  }

  const normalizedDeviceGroups = new Map<string, string[]>();
  if (filters.platform !== "all") {
    for (const raw of [
      ...new Set(
        baseEntries.flatMap((entry) =>
          getListEntryProjection(entry, filters.platform).observedDevices,
        ),
      ),
    ]) {
      const label = deviceName(raw);
      const existing = normalizedDeviceGroups.get(label) ?? [];
      existing.push(raw);
      normalizedDeviceGroups.set(label, existing);
    }
  }

  const deviceGroupList: CompatibilityDeviceGroup[] = [...normalizedDeviceGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, rawValues]) => ({ label, rawValues }));

  const filteredEntries = baseEntries.filter((entry) => {
    const projection = getListEntryProjection(entry, filters.platform);

    if (filters.status && projection.status !== filters.status) {
      return false;
    }
    if (filters.perf !== "all" && projection.perf !== filters.perf) {
      return false;
    }
    if (filters.platform !== "all" && filters.device) {
      const rawValues =
        deviceGroupList.find((group) => group.label === filters.device)?.rawValues ??
        [filters.device];
      if (!projection.observedDevices.some((device) => rawValues.includes(device))) {
        return false;
      }
    }

    return true;
  });

  const sortedEntries = sortCompatibilityEntries(filteredEntries, filters.platform, filters.sort);
  const pageCount = Math.max(1, Math.ceil(sortedEntries.length / pageSize));
  const page = Math.min(filters.page, pageCount);
  const start = (page - 1) * pageSize;
  const entries = sortedEntries.slice(start, start + pageSize);

  return {
    filters: {
      ...filters,
      page,
    },
    entries,
    totalTracked,
    testedCount,
    baseTotal: baseEntries.length,
    filteredTotal: sortedEntries.length,
    totalHiddenReports,
    statusCounts,
    deviceGroups: deviceGroupList,
    alphaCounts,
    page,
    pageCount,
    pageSize,
  };
}
