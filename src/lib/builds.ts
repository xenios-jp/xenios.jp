import "server-only";

import { cache } from "react";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Architecture, Platform, ReportBuildChannel } from "@/lib/compatibility";
import {
  getArtifactLabel,
  getBuildDisplayLabel,
  normalizeBuildChannel,
  normalizeBuildArchitecture,
  normalizeBuildStage,
} from "@/lib/build-display";

export type BuildChannel = Extract<ReportBuildChannel, "release" | "preview">;
export type BuildHistoryFilter = BuildChannel | "all";

export interface PublicBuildArtifact {
  id?: string;
  name?: string;
  label?: string;
  arch?: Architecture | "universal";
  kind?: string;
  platform?: Platform;
  downloadUrl?: string;
  sha256?: string;
  sizeBytes?: number;
  sizeLabel?: string;
}

export interface PublicBuildEntry {
  buildId?: string;
  channel?: BuildChannel;
  official?: boolean;
  appVersion?: string;
  buildNumber?: string;
  stage?: "alpha" | "beta" | "rc" | "stable";
  commitShort?: string;
  publishedAt?: string;
  label?: string;
  notes?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  artifacts: PublicBuildArtifact[];
}

export interface ReleaseBuildsManifest {
  generatedAt?: string;
  platforms: Record<Platform, Partial<Record<BuildChannel, PublicBuildEntry | null>>>;
}

export interface BuildHistoryEntry extends PublicBuildEntry {
  id: string;
  platform: Platform;
  submittedBy?: string;
  prNumber?: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const RELEASE_BUILDS_PATH = path.join(DATA_DIR, "release-builds.json");
const BUILDS_HISTORY_PATH = path.join(DATA_DIR, "builds-history.json");

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const lower = trimmed.toLowerCase();
  if (lower === "n/a" || lower === "tbd" || lower === "placeholder") {
    return undefined;
  }

  return trimmed;
}

function cleanNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function cleanBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeChannel(value: unknown): BuildChannel | undefined {
  const channel = normalizeBuildChannel(value);
  return channel === "release" || channel === "preview" ? channel : undefined;
}

function normalizePlatform(value: unknown): Platform | undefined {
  return value === "ios" || value === "macos" ? value : undefined;
}

function normalizeArch(value: unknown): Architecture | "universal" | undefined {
  return normalizeBuildArchitecture(value);
}

function inferPlatformFromBuildId(buildId?: string): Platform | undefined {
  if (!buildId) return undefined;
  if (buildId.startsWith("ios-")) return "ios";
  if (buildId.startsWith("macos-")) return "macos";
  return undefined;
}

function normalizeArtifact(value: unknown, fallbackPlatform?: Platform): PublicBuildArtifact | null {
  const record = asRecord(value);
  if (!record) return null;

  const artifact: PublicBuildArtifact = {
    id: cleanString(record.id),
    name: cleanString(record.name),
    label: cleanString(record.label),
    arch: normalizeArch(record.arch),
    kind: cleanString(record.kind),
    platform: normalizePlatform(record.platform) ?? fallbackPlatform,
    downloadUrl: cleanString(record.downloadUrl) ?? cleanString(record.url),
    sha256: cleanString(record.sha256),
    sizeBytes: cleanNumber(record.sizeBytes),
    sizeLabel: cleanString(record.sizeLabel),
  };

  const hasRenderableContent =
    Boolean(artifact.downloadUrl) ||
    Boolean(artifact.label) ||
    Boolean(artifact.name) ||
    Boolean(artifact.sha256);

  return hasRenderableContent ? artifact : null;
}

function normalizeBuildEntry(
  value: unknown,
  fallbackPlatform?: Platform,
  fallbackChannel?: BuildChannel,
): PublicBuildEntry | null {
  const record = asRecord(value);
  if (!record) return null;

  const artifacts = Array.isArray(record.artifacts)
    ? record.artifacts
        .map((entry) => normalizeArtifact(entry, fallbackPlatform))
        .filter((entry): entry is PublicBuildArtifact => entry !== null)
    : [];

  const build: PublicBuildEntry = {
    buildId: cleanString(record.buildId),
    channel: normalizeChannel(record.channel) ?? fallbackChannel,
    official: cleanBoolean(record.official),
    appVersion: cleanString(record.appVersion),
    buildNumber: cleanString(record.buildNumber),
    stage: normalizeBuildStage(record.stage),
    commitShort: cleanString(record.commitShort),
    publishedAt: cleanString(record.publishedAt) ?? cleanString(record.releasedAt),
    label: cleanString(record.label),
    notes: cleanString(record.notes),
    sourceLabel: cleanString(record.sourceLabel),
    sourceUrl: cleanString(record.sourceUrl),
    artifacts,
  };

  return isRenderableBuild(build) ? build : null;
}

function isBuildHistoryEntry(
  entry: BuildHistoryEntry | null,
): entry is BuildHistoryEntry {
  return entry !== null;
}

function readOptionalJson(filePath: string): unknown | null {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

const loadReleaseManifest = cache((): ReleaseBuildsManifest => {
  const raw = readOptionalJson(RELEASE_BUILDS_PATH);
  const record = asRecord(raw);

  const empty: ReleaseBuildsManifest = {
    generatedAt: undefined,
    platforms: {
      ios: {},
      macos: {},
    },
  };

  if (!record) return empty;

  const platforms = asRecord(record.platforms);
  const ios = asRecord(platforms?.ios);
  const macos = asRecord(platforms?.macos);

  return {
    generatedAt: cleanString(record.generatedAt),
    platforms: {
      ios: {
        release: normalizeBuildEntry(ios?.release, "ios", "release"),
        preview: normalizeBuildEntry(ios?.preview, "ios", "preview"),
      },
      macos: {
        release: normalizeBuildEntry(macos?.release, "macos", "release"),
        preview: normalizeBuildEntry(macos?.preview, "macos", "preview"),
      },
    },
  };
});

const loadHistory = cache((): BuildHistoryEntry[] => {
  const raw = readOptionalJson(BUILDS_HISTORY_PATH);
  const builds = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw)?.builds)
      ? (asRecord(raw)?.builds as unknown[])
      : [];

  const entries: Array<BuildHistoryEntry | null> = builds.map((entry, index) => {
      const record = asRecord(entry);
      if (!record) return null;

      const platform =
        normalizePlatform(record.platform) ??
        inferPlatformFromBuildId(cleanString(record.buildId));
      const channel = normalizeChannel(record.channel);
      if (!platform || !channel) return null;

      const normalized = normalizeBuildEntry(record, platform, channel);
      if (!normalized) return null;

      return {
        ...normalized,
        id:
          cleanString(record.id) ??
          `${platform}-${channel}-${normalized.buildId ?? normalized.label ?? index}`,
        platform,
        submittedBy: cleanString(record.submittedBy),
        prNumber: cleanNumber(record.prNumber),
      };
    });

  return entries
    .filter(isBuildHistoryEntry)
    .sort((left, right) => {
      const leftTime = left.publishedAt ? Date.parse(left.publishedAt) : 0;
      const rightTime = right.publishedAt ? Date.parse(right.publishedAt) : 0;
      return rightTime - leftTime;
    });
});

export function getReleaseBuildsManifest(): ReleaseBuildsManifest {
  return loadReleaseManifest();
}

export function getLatestBuild(
  platform: Platform,
  channel: BuildChannel,
): PublicBuildEntry | null {
  return getReleaseBuildsManifest().platforms[platform]?.[channel] ?? null;
}

export function getBuildsHistory(filter: BuildHistoryFilter = "all"): BuildHistoryEntry[] {
  const builds = loadHistory();
  if (filter === "all") return builds;
  return builds.filter((build) => build.channel === filter);
}

export function isRenderableBuild(
  build: PublicBuildEntry | null | undefined,
): build is PublicBuildEntry {
  if (!build) return false;
  return Boolean(
    build.buildId ||
      build.label ||
      build.appVersion ||
      build.buildNumber ||
      build.commitShort ||
      build.artifacts.length,
  );
}

export function getBuildChannelLabel(channel: BuildChannel): string {
  return channel === "release" ? "Release" : "Preview";
}

export function formatPublishedDate(value?: string): string {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatFileSize(
  sizeBytes?: number,
  sizeLabel?: string,
): string | null {
  if (sizeLabel) return sizeLabel;
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return null;
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = sizeBytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export { getArtifactLabel, getBuildDisplayLabel };
