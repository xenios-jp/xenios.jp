"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { Pill } from "@/components/pill";
import {
  SUMMARY_STATUS_ORDER,
  deviceName,
  getPerfLabel,
  getPlatformLabel,
  getStatusLabel,
  type PerfTier,
  type Platform,
  type SummaryStatus,
} from "@/lib/compatibility";
import {
  CATALOG_BUCKETS,
  alphaBucketLabel,
  catalogBucketToSlug,
  type CatalogBucket,
  type PlatformFilter,
  type SortKey,
} from "@/lib/compatibility-browse";
import type {
  CompatibilityAlphaCount,
  CompatibilityListEntry,
  CompatibilityPlatformEntry,
  CompatibilityStatusSummaryByPlatform,
} from "@/lib/game-detail";
import { COMPATIBILITY_TRACKER_REPORT_URL } from "@/lib/constants";

interface EntryProjection {
  platform: Platform | null;
  status: SummaryStatus;
  perf: PerfTier;
  updatedAt: string;
  observedDevices: string[];
  variesByDevice: boolean;
}

type CompatibilityListMode = "tested" | "catalog";

interface CompatibilityListProps {
  mode: CompatibilityListMode;
  entries: CompatibilityListEntry[];
  totalTracked: number;
  testedCount: number;
  totalHiddenReports: number;
  bucketCounts?: CompatibilityAlphaCount[];
  activeBucket?: CatalogBucket;
  catalogSummaryByPlatform?: CompatibilityStatusSummaryByPlatform;
  catalogPage?: number;
  catalogPageCount?: number;
  catalogTotalEntries?: number;
  catalogBasePath?: string;
}

const STATUS_COLORS: Record<SummaryStatus, string> = {
  playable: "bg-emerald-400",
  ingame: "bg-blue-400",
  intro: "bg-amber-400",
  loads: "bg-orange-400",
  nothing: "bg-red-400",
  untested: "bg-zinc-400",
};

function parseDateValue(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDateLabel(value?: string | null): string {
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

function getPlatformFilterLabel(platform: PlatformFilter): string {
  if (platform === "ios") return "iOS";
  if (platform === "macos") return "macOS";
  return "All Platforms";
}

function entryHref(slug: string): string {
  return `/compatibility/${slug}`;
}

function titleIdsForDisplay(entry: CompatibilityListEntry): string[] {
  return entry.game.titleIds.length > 0 ? entry.game.titleIds : [entry.game.titleId];
}

function TitleIdList({
  entry,
  compact = false,
  interactive = true,
}: {
  entry: CompatibilityListEntry;
  compact?: boolean;
  interactive?: boolean;
}) {
  const titleIds = titleIdsForDisplay(entry);

  return (
    <div className={`flex flex-col ${compact ? "gap-0.5" : "gap-1"}`}>
      {titleIds.map((titleId) =>
        interactive ? (
          <Link
            key={titleId}
            href={entryHref(entry.game.slug)}
            className="font-mono text-sm text-text-muted transition hover:text-accent"
          >
            {titleId}
          </Link>
        ) : (
          <span key={titleId} className="font-mono text-sm text-text-muted">
            {titleId}
          </span>
        ),
      )}
    </div>
  );
}

function getPlatformEntry(
  entry: CompatibilityListEntry,
  platform: Platform,
): CompatibilityPlatformEntry | null {
  return entry.platformEntries.find((candidate) => candidate.platform === platform) ?? null;
}

function getEntryProjection(
  entry: CompatibilityListEntry,
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

function getDisplayedPlatforms(
  entry: CompatibilityListEntry,
  platform: PlatformFilter,
): Platform[] {
  if (platform === "all") {
    return entry.platformEntries.map((candidate) => candidate.platform);
  }
  return entry.platformEntries.some((candidate) => candidate.platform === platform)
    ? [platform]
    : [];
}

function hasPlatformVariance(entry: CompatibilityListEntry): boolean {
  const statuses = new Set(entry.platformEntries.map((candidate) => candidate.status));
  return statuses.size > 1;
}

function observedDevicesLabel(observedDevices: string[], variesByDevice: boolean): string {
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

function sortEntries(
  entries: CompatibilityListEntry[],
  platform: PlatformFilter,
  sort: SortKey,
): CompatibilityListEntry[] {
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

function countForBucket(
  bucketCounts: CompatibilityAlphaCount[] | undefined,
  bucket: CatalogBucket,
): number {
  return bucketCounts?.find((entry) => entry.bucket === bucket)?.count ?? 0;
}

function paginationItems(page: number, pageCount: number): Array<number | "ellipsis"> {
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

function catalogPageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}/page/${page}`;
}

function matchesSearch(entry: CompatibilityListEntry, query: string): boolean {
  const normalizedQuery = query.toLowerCase();
  return (
    entry.game.title.toLowerCase().includes(normalizedQuery) ||
    entry.game.titleIds.some((titleId) => titleId.toLowerCase().includes(normalizedQuery)) ||
    entry.game.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
  );
}

function GameRow({
  entry,
  platform,
}: {
  entry: CompatibilityListEntry;
  platform: PlatformFilter;
}) {
  const projection = getEntryProjection(entry, platform);
  const displayedPlatforms = getDisplayedPlatforms(entry, platform);

  return (
    <tr className="border-b border-border transition hover:bg-bg-surface/60">
      <td className="py-2.5 pr-4 pl-4 font-mono text-sm text-text-muted">
        <TitleIdList entry={entry} />
      </td>
      <td className="py-2.5 pr-4">
        <Link
          href={entryHref(entry.game.slug)}
          className="font-medium text-text-primary transition hover:text-accent"
        >
          {entry.game.title}
        </Link>
      </td>
      <td className="py-2.5 pr-4">
        <div className="flex flex-wrap items-center gap-2">
          {displayedPlatforms.length > 0 ? (
            displayedPlatforms.map((candidate) => (
              <Pill key={candidate} variant={candidate}>
                {getPlatformLabel(candidate)}
              </Pill>
            ))
          ) : (
            <Pill variant="untested">Unverified</Pill>
          )}
        </div>
      </td>
      <td className="py-2.5 pr-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill variant={projection.status}>{getStatusLabel(projection.status)}</Pill>
          {platform === "all" && hasPlatformVariance(entry) ? (
            <Pill variant="tag">Varies by platform</Pill>
          ) : null}
        </div>
      </td>
      <td className="py-2.5 pr-4">
        <Pill variant={projection.perf}>{getPerfLabel(projection.perf)}</Pill>
      </td>
      <td className="py-2.5 pr-4 text-sm text-text-secondary">
        {observedDevicesLabel(projection.observedDevices, projection.variesByDevice)}
      </td>
      <td className="py-2.5 pr-4 text-sm text-text-muted">
        {formatDateLabel(projection.updatedAt)}
      </td>
    </tr>
  );
}

function GameCard({
  entry,
  platform,
}: {
  entry: CompatibilityListEntry;
  platform: PlatformFilter;
}) {
  const projection = getEntryProjection(entry, platform);
  const displayedPlatforms = getDisplayedPlatforms(entry, platform);

  return (
    <Link
      href={entryHref(entry.game.slug)}
      className="block rounded-lg border border-border bg-bg-surface p-4 transition hover:border-accent/20"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-text-primary">{entry.game.title}</h3>
          <div className="mt-1">
            <TitleIdList entry={entry} compact interactive={false} />
          </div>
        </div>
        <Pill variant={projection.status}>{getStatusLabel(projection.status)}</Pill>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {displayedPlatforms.length > 0 ? (
          displayedPlatforms.map((candidate) => (
            <Pill key={candidate} variant={candidate}>
              {getPlatformLabel(candidate)}
            </Pill>
          ))
        ) : (
          <Pill variant="untested">Unverified</Pill>
        )}
        <Pill variant={projection.perf}>{getPerfLabel(projection.perf)}</Pill>
        {projection.variesByDevice ? <Pill variant="tag">Varies by device</Pill> : null}
        {platform === "all" && hasPlatformVariance(entry) ? (
          <Pill variant="tag">Varies by platform</Pill>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-text-muted">
        <span>{observedDevicesLabel(projection.observedDevices, projection.variesByDevice)}</span>
        <span>{formatDateLabel(projection.updatedAt)}</span>
      </div>
    </Link>
  );
}

export function CompatibilityList({
  mode,
  entries: allEntries,
  totalTracked,
  testedCount,
  totalHiddenReports,
  bucketCounts,
  activeBucket,
  catalogSummaryByPlatform,
  catalogPage,
  catalogPageCount,
  catalogTotalEntries,
  catalogBasePath,
}: CompatibilityListProps) {
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SummaryStatus | null>(null);
  const [perf, setPerf] = useState<PerfTier | "all">("all");
  const [device, setDevice] = useState("");
  const [sort, setSort] = useState<SortKey>(mode === "catalog" ? "alpha" : "updated");

  const isCatalogMode = mode === "catalog";
  const currentPlatform = platform;
  const platformScopedEntries =
    !isCatalogMode && currentPlatform !== "all"
      ? allEntries.filter((entry) => entry.historyPlatforms.includes(currentPlatform))
      : allEntries;
  const trimmedQuery = query.trim();
  const searchedEntries = trimmedQuery
    ? platformScopedEntries.filter((entry) => matchesSearch(entry, trimmedQuery))
    : platformScopedEntries;

  const localStatusCounts: Record<SummaryStatus, number> = {
    playable: 0,
    ingame: 0,
    intro: 0,
    loads: 0,
    nothing: 0,
    untested: 0,
  };

  for (const entry of searchedEntries) {
    const projection = getEntryProjection(entry, currentPlatform);
    localStatusCounts[projection.status] += 1;
  }
  const visibleSummaryStatuses =
    isCatalogMode || localStatusCounts.untested > 0
      ? SUMMARY_STATUS_ORDER
      : SUMMARY_STATUS_ORDER.filter((summaryStatus) => summaryStatus !== "untested");

  const normalizedDeviceGroups = new Map<string, string[]>();
  if (currentPlatform !== "all") {
    for (const raw of [
      ...new Set(
        searchedEntries.flatMap((entry) =>
          getEntryProjection(entry, currentPlatform).observedDevices,
        ),
      ),
    ]) {
      const label = deviceName(raw);
      const existing = normalizedDeviceGroups.get(label) ?? [];
      existing.push(raw);
      normalizedDeviceGroups.set(label, existing);
    }
  }

  const deviceGroups = [...normalizedDeviceGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, rawValues]) => ({ label, rawValues }));

  const filteredEntries = searchedEntries.filter((entry) => {
    const projection = getEntryProjection(entry, currentPlatform);

    if (status && projection.status !== status) {
      return false;
    }
    if (perf !== "all" && projection.perf !== perf) {
      return false;
    }
    if (currentPlatform !== "all" && device) {
      const rawValues =
        deviceGroups.find((group) => group.label === device)?.rawValues ?? [device];
      if (
        !projection.observedDevices.some((observedDevice) => rawValues.includes(observedDevice))
      ) {
        return false;
      }
    }

    return true;
  });

  const sortedEntries = sortEntries(filteredEntries, currentPlatform, sort);
  const effectiveCatalogPageCount = isCatalogMode
    ? Math.max(1, catalogPageCount ?? 1)
    : 1;
  const effectiveCatalogPage = isCatalogMode
    ? Math.min(catalogPage ?? 1, effectiveCatalogPageCount)
    : 1;
  const visibleEntries = sortedEntries;
  const hasFilter =
    currentPlatform !== "all" ||
    Boolean(trimmedQuery) ||
    status !== null ||
    perf !== "all" ||
    Boolean(device) ||
    sort !== (mode === "catalog" ? "alpha" : "updated");

  const heroCountLabel =
    mode === "catalog"
      ? `${totalTracked} canonical titles in the full catalog`
      : `${testedCount} games with report or discussion history`;

  const hasCatalogPagination =
    isCatalogMode &&
    Boolean(catalogBasePath) &&
    effectiveCatalogPageCount > 1;
  const resolvedCatalogBasePath = catalogBasePath ?? "/compatibility/catalog";
  const summaryForCurrentPlatform =
    isCatalogMode && catalogSummaryByPlatform
      ? catalogSummaryByPlatform[currentPlatform]
      : null;
  const summaryStatusCounts = summaryForCurrentPlatform?.statusCounts ?? localStatusCounts;
  const summaryTotal = summaryForCurrentPlatform?.total ?? searchedEntries.length;
  const statusCounts = localStatusCounts;
  const baseTotal = searchedEntries.length;
  const statusGridClass = isCatalogMode ? "lg:grid-cols-6" : "lg:grid-cols-5";
  const catalogViewTotal = isCatalogMode ? allEntries.length : 0;

  const handlePlatformChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextPlatform =
      event.target.value === "ios" || event.target.value === "macos"
        ? event.target.value
        : "all";
    setPlatform(nextPlatform);
    setDevice("");
  };

  const resetFilters = () => {
    setPlatform("all");
    setQuery("");
    setStatus(null);
    setPerf("all");
    setDevice("");
    setSort(mode === "catalog" ? "alpha" : "updated");
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <section className="hero-gradient border-b border-border px-4 pt-20 pb-10 sm:px-6 md:pb-12 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
                Compatibility
              </h1>
              <p className="mt-2 text-lg text-text-secondary">{heroCountLabel}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill variant="tag">{getPlatformFilterLabel(currentPlatform)}</Pill>
              <Pill variant="tag">{mode === "catalog" ? "Full Catalog" : "Tested Only"}</Pill>
              {activeBucket ? <Pill variant="tag">{alphaBucketLabel(activeBucket)} Bucket</Pill> : null}
              {totalHiddenReports > 0 ? (
                <Pill variant="tag">{totalHiddenReports} filtered reports</Pill>
              ) : null}
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted">
            Detail pages still highlight the latest official release when that evidence exists.
            The tested view includes any title with reports or GitHub discussion history, while
            the catalog keeps untested placeholders in A-Z buckets so browsing does not flood a
            single page.
          </p>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted">
            XeniOS is still alpha software. Reports describe what happened on specific devices and
            builds, not a guarantee of a smooth or complete experience.
          </p>
        </div>
      </section>

      <section className="border-b border-border px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-bg-surface p-1">
            <Link
              href="/compatibility"
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === "tested"
                  ? "bg-accent text-accent-fg"
                  : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
              }`}
            >
              Tested <span className="text-current/80">({testedCount})</span>
            </Link>
            <Link
              href="/compatibility/catalog"
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === "catalog"
                  ? "bg-accent text-accent-fg"
                  : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
              }`}
            >
              Full Catalog <span className="text-current/80">({totalTracked})</span>
            </Link>
          </div>

          <div className="mt-4 text-sm text-text-muted">
            {mode === "catalog"
              ? "Browse the full catalog by category and page. The tested view stays separate so titles with history are easier to scan."
              : "Titles with reports or GitHub discussion history appear here. Use the full catalog to browse untested placeholders."}
          </div>

          <div className={`mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 ${statusGridClass}`}>
            {visibleSummaryStatuses.map((summaryStatus) => {
              const count = summaryStatusCounts[summaryStatus];
              const pct = summaryTotal > 0 ? (count / summaryTotal) * 100 : 0;
              return (
                <div key={summaryStatus} className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_COLORS[summaryStatus]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {getStatusLabel(summaryStatus)}
                      </span>
                      <span className="text-sm text-text-muted">
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-bg-surface-2">
                      <div
                        className={`h-1.5 rounded-full ${STATUS_COLORS[summaryStatus]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {mode === "catalog" && bucketCounts ? (
            <div className="mt-5 inline-flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-border bg-bg-surface p-1.5">
              <Link
                href="/compatibility/catalog"
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  !activeBucket
                    ? "bg-accent text-accent-fg"
                    : "text-text-primary hover:bg-bg-surface-2"
                }`}
              >
                All
              </Link>
              {CATALOG_BUCKETS.map((bucket) => (
                <Link
                  key={bucket}
                  href={`/compatibility/catalog/${catalogBucketToSlug(bucket)}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    activeBucket === bucket
                      ? "bg-accent text-accent-fg"
                      : "text-text-primary hover:bg-bg-surface-2"
                  }`}
                >
                  {alphaBucketLabel(bucket)}
                </Link>
              ))}
            </div>
          ) : null}

          {mode === "catalog" && bucketCounts ? (
            <p className="mt-3 text-sm text-text-muted">
              {!activeBucket
                ? `All catalog: ${totalTracked} canonical titles`
                : `${alphaBucketLabel(activeBucket)} bucket: ${countForBucket(
                    bucketCounts,
                    activeBucket,
                  )} canonical titles`}
              {effectiveCatalogPageCount > 0
                ? ` · page ${effectiveCatalogPage} of ${effectiveCatalogPageCount}`
                : ""}
            </p>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatus(null)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              status === null
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-bg-surface text-text-secondary hover:text-text-primary"
            }`}
          >
            All ({baseTotal})
          </button>
          {visibleSummaryStatuses.map((summaryStatus) => (
            <button
              key={summaryStatus}
              type="button"
              onClick={() =>
                setStatus((currentStatus) =>
                  currentStatus === summaryStatus ? null : summaryStatus,
                )
              }
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                status === summaryStatus
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-bg-surface text-text-secondary hover:text-text-primary"
              }`}
            >
              {getStatusLabel(summaryStatus)} ({statusCounts[summaryStatus]})
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, title ID, or tag..."
              aria-label="Search games"
              className="w-full rounded-lg border border-border bg-bg-surface py-2.5 pl-10 pr-4 text-base text-text-primary placeholder-text-muted outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={platform}
              onChange={handlePlatformChange}
              aria-label="Filter by platform"
              className="rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent/40"
            >
              <option value="all">All Platforms</option>
              <option value="ios">iOS</option>
              <option value="macos">macOS</option>
            </select>

            <select
              value={perf}
              onChange={(event) =>
                setPerf(
                  event.target.value === "great" ||
                    event.target.value === "ok" ||
                    event.target.value === "poor" ||
                    event.target.value === "n/a"
                    ? event.target.value
                    : "all",
                )
              }
              aria-label="Filter by performance"
              className="rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent/40"
            >
              <option value="all">All Performance</option>
              <option value="great">Great</option>
              <option value="ok">OK</option>
              <option value="poor">Poor</option>
              <option value="n/a">N/A</option>
            </select>

            <select
              value={device}
              onChange={(event) => setDevice(event.target.value)}
              aria-label="Filter by device"
              disabled={platform === "all"}
              className="rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent/40 disabled:cursor-not-allowed disabled:text-text-muted"
            >
              <option value="">
                {platform === "all" ? "Select Platform First" : "All Devices"}
              </option>
              {deviceGroups.map((group) => (
                <option key={group.label} value={group.label}>
                  {group.label}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value === "alpha" ? "alpha" : "updated")}
              aria-label="Sort order"
              className="rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent/40"
            >
              <option value="updated">Recently Updated</option>
              <option value="alpha">Alphabetical</option>
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-border bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-bg-surface-2 hover:text-text-primary"
            >
              Reset
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm text-text-muted">
          {isCatalogMode
            ? `Showing ${visibleEntries.length} of ${catalogViewTotal} titles on this page`
            : `Showing ${visibleEntries.length} of ${baseTotal} games`}
          {hasFilter ? " matching the current view" : ""}
          {isCatalogMode && catalogTotalEntries && catalogTotalEntries !== catalogViewTotal
            ? ` · ${catalogTotalEntries} titles across this catalog section`
            : ""}
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
        <div className="hidden overflow-x-auto rounded-xl border border-border bg-bg-surface md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-text-muted">
                <th className="py-3 pr-4 pl-4">Title IDs</th>
                <th className="py-3 pr-4">Title</th>
                <th className="py-3 pr-4">Platforms</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Perf</th>
                <th className="py-3 pr-4">Observed On</th>
                <th className="py-3 pr-4">Updated</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <GameRow key={entry.game.slug} entry={entry} platform={currentPlatform} />
              ))}
            </tbody>
          </table>

          {visibleEntries.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-text-muted">
              No games match the current view.
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 md:hidden">
          {visibleEntries.map((entry) => (
            <GameCard key={entry.game.slug} entry={entry} platform={currentPlatform} />
          ))}

          {visibleEntries.length === 0 ? (
            <div className="rounded-lg border border-border bg-bg-surface px-6 py-12 text-center text-sm text-text-muted">
              No games match the current view.
            </div>
          ) : null}
        </div>
      </div>

      {hasCatalogPagination ? (
        <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-bg-surface px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm font-semibold text-text-primary sm:text-base">
                Page {effectiveCatalogPage} of {effectiveCatalogPageCount}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={catalogPageHref(
                    resolvedCatalogBasePath,
                    Math.max(1, effectiveCatalogPage - 1),
                  )}
                  aria-disabled={effectiveCatalogPage === 1}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    effectiveCatalogPage === 1
                      ? "pointer-events-none bg-bg-surface text-text-muted"
                      : "bg-bg-surface text-text-primary hover:bg-bg-surface-2"
                  }`}
                >
                  Prev
                </Link>

                {paginationItems(effectiveCatalogPage, effectiveCatalogPageCount).map(
                  (item, index) =>
                    item === "ellipsis" ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 text-sm font-semibold text-text-muted"
                      >
                        …
                      </span>
                    ) : (
                      <Link
                        key={item}
                        href={catalogPageHref(resolvedCatalogBasePath, item)}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          item === effectiveCatalogPage
                            ? "bg-accent text-accent-fg"
                            : "bg-bg-surface text-text-primary hover:bg-bg-surface-2"
                        }`}
                      >
                        {String(item).padStart(2, "0")}
                      </Link>
                    ),
                )}

                <Link
                  href={catalogPageHref(
                    resolvedCatalogBasePath,
                    Math.min(effectiveCatalogPageCount, effectiveCatalogPage + 1),
                  )}
                  aria-disabled={effectiveCatalogPage === effectiveCatalogPageCount}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    effectiveCatalogPage === effectiveCatalogPageCount
                      ? "pointer-events-none bg-bg-surface text-text-muted"
                      : "bg-bg-surface text-text-primary hover:bg-bg-surface-2"
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-accent/20 bg-accent/[0.04] p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold text-text-primary">
            Don&apos;t see your game?
          </h2>
          <p className="mt-2 mb-4 text-[15px] leading-relaxed text-text-secondary">
            Help the community by testing a game and submitting a compatibility report.
          </p>
          <a
            href={COMPATIBILITY_TRACKER_REPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-[15px] font-semibold text-accent-fg transition hover:bg-accent-hover"
          >
            Submit Report
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </section>
      </div>
    </div>
  );
}
