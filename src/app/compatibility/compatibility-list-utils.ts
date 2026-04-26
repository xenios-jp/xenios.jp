/**
 * Pure helpers and shared types for the compatibility list/catalog UI.
 *
 * Extracted from compatibility-list.tsx so the React component file can
 * focus on JSX. None of this code touches the DOM, hooks, or React state,
 * so it stays trivially unit-testable and free of "use client" overhead
 * if it's ever needed from a server component.
 */

import {
  deviceName,
  type PerfTier,
  type Platform,
  type SummaryStatus,
} from "@/lib/compatibility";
import {
  alphaBucketForTitle,
  type CatalogBucket,
  type PlatformFilter,
  type SortKey,
} from "@/lib/compatibility-browse";
import type {
  CompatibilityAlphaCount,
  CompatibilityPlatformEntry,
} from "@/lib/game-detail";

export interface EntryProjection {
  platform: Platform | null;
  status: SummaryStatus;
  perf: PerfTier;
  updatedAt: string;
  observedDevices: string[];
  variesByDevice: boolean;
}

export type CompatibilityListMode = "tested" | "catalog";

export interface DisplayEntryGame {
  slug: string;
  title: string;
  titleId: string;
  titleIds: string[];
  tags?: string[];
}

export interface DisplayEntry {
  game: DisplayEntryGame;
  platform: Platform | null;
  status: SummaryStatus;
  perf: PerfTier;
  updatedAt: string;
  latestActivityDate?: string | null;
  observedDevices: string[];
  variesByDevice: boolean;
  platformEntries: CompatibilityPlatformEntry[];
}

export type RawCatalogSearchEntry = DisplayEntry & {
  searchText: string;
  titleBucket: ReturnType<typeof alphaBucketForTitle>;
};

export type CatalogSearchEntry = RawCatalogSearchEntry & {
  normalizedTitle: string;
  normalizedTitleIds: string[];
  normalizedTags: string[];
  titleWords: string[];
  tagWords: string[][];
};

export const STATUS_COLORS: Record<SummaryStatus, string> = {
  playable: "bg-emerald-400",
  ingame: "bg-blue-400",
  intro: "bg-amber-400",
  loads: "bg-orange-400",
  nothing: "bg-red-400",
  untested: "bg-zinc-400",
};

export function parseDateValue(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatDateLabel(value?: string | null): string {
  if (!value) return "Unverified";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function getPlatformFilterLabel(platform: PlatformFilter): string {
  if (platform === "ios") return "iOS";
  if (platform === "macos") return "macOS";
  return "All Platforms";
}

export function entryHref(slug: string): string {
  return `/compatibility/${slug}`;
}

export function titleIdsForDisplay(entry: DisplayEntry): string[] {
  return entry.game.titleIds.length > 0 ? entry.game.titleIds : [entry.game.titleId];
}

export function entryListKey(entry: DisplayEntry): string {
  return `${entry.game.slug}:${titleIdsForDisplay(entry).join("|")}`;
}

export function getPlatformEntry(
  entry: DisplayEntry,
  platform: Platform,
): CompatibilityPlatformEntry | null {
  return entry.platformEntries.find((candidate) => candidate.platform === platform) ?? null;
}

export function getEntryProjection(
  entry: DisplayEntry,
  platform: PlatformFilter,
): EntryProjection {
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

  const platformEntry = getPlatformEntry(entry, platform);
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

export function getDisplayedPlatforms(
  entry: DisplayEntry,
  platform: PlatformFilter,
): Platform[] {
  if (platform === "all") {
    return entry.platformEntries.map((candidate) => candidate.platform);
  }
  return entry.platformEntries.some((candidate) => candidate.platform === platform)
    ? [platform]
    : [];
}

export function hasPlatformVariance(entry: DisplayEntry): boolean {
  const statuses = new Set(entry.platformEntries.map((candidate) => candidate.status));
  return statuses.size > 1;
}

export function observedDevicesLabel(observedDevices: string[], variesByDevice: boolean): string {
  if (observedDevices.length === 0) {
    return "Unverified";
  }

  if (!variesByDevice) {
    return deviceName(observedDevices[0]);
  }

  const [firstDevice, ...rest] = observedDevices;
  if (rest.length === 0) {
    return deviceName(firstDevice);
  }

  return `${deviceName(firstDevice)} + ${rest.length} more`;
}

export function sortEntries(
  entries: DisplayEntry[],
  platform: PlatformFilter,
  sort: SortKey,
): DisplayEntry[] {
  const sorted = [...entries];
  if (sort === "alpha") {
    sorted.sort((left, right) => left.game.title.localeCompare(right.game.title));
    return sorted;
  }

  sorted.sort((left, right) => {
    const rightProjection = getEntryProjection(right, platform);
    const leftProjection = getEntryProjection(left, platform);
    const dateDelta =
      parseDateValue(rightProjection.updatedAt || right.latestActivityDate) -
      parseDateValue(leftProjection.updatedAt || left.latestActivityDate);
    if (dateDelta !== 0) {
      return dateDelta;
    }
    return left.game.title.localeCompare(right.game.title);
  });
  return sorted;
}

export function countForBucket(
  bucketCounts: CompatibilityAlphaCount[] | undefined,
  bucket: CatalogBucket,
): number {
  return bucketCounts?.find((entry) => entry.bucket === bucket)?.count ?? 0;
}

export function paginationItems(page: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 12) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, page - 5);
  const end = Math.min(pageCount - 1, page + 5);

  if (start > 2) {
    items.push("ellipsis");
  }

  for (let value = start; value <= end; value += 1) {
    items.push(value);
  }

  if (end < pageCount - 1) {
    items.push("ellipsis");
  }

  items.push(pageCount);
  return items;
}

export function catalogPageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}/page/${page}`;
}

function normalizeSearchValue(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactSearchValue(value: string): string {
  return normalizeSearchValue(value).replace(/ /g, "");
}

function splitSearchWords(value: string): string[] {
  const normalized = normalizeSearchValue(value);
  return normalized ? normalized.split(/\s+/) : [];
}

function hasSequentialWordPrefix(words: string[], queryWords: string[]): boolean {
  let index = 0;

  for (const queryWord of queryWords) {
    let found = false;

    while (index < words.length) {
      if (words[index]?.startsWith(queryWord)) {
        found = true;
        index += 1;
        break;
      }
      index += 1;
    }

    if (!found) {
      return false;
    }
  }

  return true;
}

export function matchesSearch(entry: DisplayEntry, query: string): boolean {
  const normalizedQuery = query.toLowerCase();
  return (
    entry.game.title.toLowerCase().includes(normalizedQuery) ||
    entry.game.titleIds.some((titleId) => titleId.toLowerCase().includes(normalizedQuery)) ||
    (entry.game.tags?.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ?? false)
  );
}

export function prepareCatalogSearchEntry(entry: RawCatalogSearchEntry): CatalogSearchEntry {
  return {
    ...entry,
    normalizedTitle: normalizeSearchValue(entry.game.title),
    normalizedTitleIds: entry.game.titleIds.map((titleId) => compactSearchValue(titleId)),
    normalizedTags: (entry.game.tags ?? []).map((tag) => normalizeSearchValue(tag)),
    titleWords: splitSearchWords(entry.game.title),
    tagWords: (entry.game.tags ?? []).map((tag) => splitSearchWords(tag)),
  };
}

export function isCatalogSearchEntry(entry: DisplayEntry): entry is CatalogSearchEntry {
  return "normalizedTitle" in entry;
}

export function matchesCatalogSearch(entry: CatalogSearchEntry, query: string): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return true;
  }

  const queryWords = normalizedQuery.split(/\s+/);
  const compactQuery = normalizedQuery.replace(/ /g, "");

  if (entry.normalizedTitle.startsWith(normalizedQuery)) {
    return true;
  }

  if (entry.normalizedTitleIds.some((titleId) => titleId.startsWith(compactQuery))) {
    return true;
  }

  if (entry.normalizedTags.some((tag) => tag.startsWith(normalizedQuery))) {
    return true;
  }

  if (queryWords.length > 1) {
    return (
      hasSequentialWordPrefix(entry.titleWords, queryWords) ||
      entry.tagWords.some((tagWords) => hasSequentialWordPrefix(tagWords, queryWords))
    );
  }

  if (normalizedQuery.length < 4) {
    return false;
  }

  return (
    entry.titleWords.slice(1).some((word) => word.startsWith(normalizedQuery)) ||
    entry.tagWords.some((tagWords) =>
      tagWords.slice(1).some((word) => word.startsWith(normalizedQuery)),
    )
  );
}
