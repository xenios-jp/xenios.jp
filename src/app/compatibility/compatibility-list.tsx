"use client";

import type { ChangeEvent, FormEvent } from "react";
import { Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import type {
  CompatibilityListEntry,
  CompatibilityPlatformEntry,
} from "@/lib/game-detail";
import { COMPATIBILITY_TRACKER_REPORT_URL } from "@/lib/constants";

type SortKey = "updated" | "alpha";
type PlatformFilter = "all" | Platform;

interface FilterState {
  platform: PlatformFilter;
  q: string;
  status: SummaryStatus | null;
  perf: PerfTier | "all";
  device: string;
  sort: SortKey;
}

interface EntryProjection {
  platform: Platform | null;
  status: SummaryStatus;
  perf: PerfTier;
  updatedAt: string;
  observedDevices: string[];
  variesByDevice: boolean;
}

const STATUS_COLORS: Record<SummaryStatus, string> = {
  playable: "bg-emerald-400",
  ingame: "bg-blue-400",
  intro: "bg-amber-400",
  loads: "bg-orange-400",
  nothing: "bg-red-400",
  untested: "bg-zinc-400",
};

function parsePlatform(value: string | null): PlatformFilter {
  return value === "ios" || value === "macos" ? value : "all";
}

function parseStatus(value: string | null): SummaryStatus | null {
  if (!value) return null;
  return SUMMARY_STATUS_ORDER.includes(value as SummaryStatus)
    ? (value as SummaryStatus)
    : null;
}

function parsePerf(value: string | null): PerfTier | "all" {
  if (value === "great" || value === "ok" || value === "poor" || value === "n/a") {
    return value;
  }
  return "all";
}

function parseSort(value: string | null): SortKey {
  return value === "alpha" ? "alpha" : "updated";
}

function buildQueryString(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.platform !== "all") params.set("platform", filters.platform);
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.perf !== "all") params.set("perf", filters.perf);
  if (filters.platform !== "all" && filters.device) params.set("device", filters.device);
  if (filters.sort !== "updated") params.set("sort", filters.sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}

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

function getPlatformEntry(
  entry: CompatibilityListEntry,
  platform: Platform,
): CompatibilityPlatformEntry | null {
  return entry.platformEntries.find((candidate) => candidate.platform === platform) ?? null;
}

function getEntryProjection(
  entry: CompatibilityListEntry,
  platform: PlatformFilter,
): EntryProjection | null {
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
  if (!platformEntry) return null;

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

function entryUpdatedAtMs(entry: CompatibilityListEntry, platform: PlatformFilter): number {
  return parseDateValue(getEntryProjection(entry, platform)?.updatedAt);
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

function GameRow({
  entry,
  platform,
}: {
  entry: CompatibilityListEntry;
  platform: PlatformFilter;
}) {
  const projection = getEntryProjection(entry, platform);
  if (!projection) return null;

  const displayedPlatforms = getDisplayedPlatforms(entry, platform);

  return (
    <tr className="border-b border-border transition hover:bg-bg-surface/60">
      <td className="py-2.5 pr-4 pl-4 font-mono text-sm text-text-muted">
        <Link
          href={entryHref(entry.game.slug)}
          className="transition hover:text-accent"
        >
          {entry.game.titleId}
        </Link>
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
  if (!projection) return null;

  const displayedPlatforms = getDisplayedPlatforms(entry, platform);

  return (
    <Link
      href={entryHref(entry.game.slug)}
      className="block rounded-lg border border-border bg-bg-surface p-4 transition hover:border-accent/20"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-text-primary">{entry.game.title}</h3>
          <span className="font-mono text-xs text-text-muted">
            {entry.game.titleId}
          </span>
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

function CompatibilityListInner({
  entries: allEntries,
}: {
  entries: CompatibilityListEntry[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters: FilterState = useMemo(
    () => ({
      platform: parsePlatform(searchParams.get("platform")),
      q: (searchParams.get("q") ?? "").trim(),
      status: parseStatus(searchParams.get("status")),
      perf: parsePerf(searchParams.get("perf")),
      device: searchParams.get("device") ?? "",
      sort: parseSort(searchParams.get("sort")),
    }),
    [searchParams],
  );

  const totalTracked = allEntries.length;
  const totalHiddenReports = useMemo(
    () => allEntries.reduce((sum, entry) => sum + entry.hiddenReportCount, 0),
    [allEntries],
  );

  const platformEntries = useMemo(
    () =>
      filters.platform === "all"
        ? allEntries
        : allEntries.filter((entry) => getEntryProjection(entry, filters.platform) !== null),
    [allEntries, filters.platform],
  );

  const baseTotal = platformEntries.length;

  const deviceGroups = useMemo(() => {
    if (filters.platform === "all") return [] as Array<[string, string[]]>;

    const allRaw = [
      ...new Set(
        platformEntries.flatMap(
          (entry) => getEntryProjection(entry, filters.platform)?.observedDevices ?? [],
        ),
      ),
    ];
    const groups = new Map<string, string[]>();

    for (const raw of allRaw) {
      const display = deviceName(raw);
      const existing = groups.get(display) ?? [];
      existing.push(raw);
      groups.set(display, existing);
    }

    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [platformEntries, filters.platform]);

  const deviceCount = deviceGroups.length;

  const statusCounts: Record<SummaryStatus, number> = useMemo(() => {
    const counts: Record<SummaryStatus, number> = {
      playable: 0,
      ingame: 0,
      intro: 0,
      loads: 0,
      nothing: 0,
      untested: 0,
    };

    platformEntries.forEach((entry) => {
      const projection = getEntryProjection(entry, filters.platform);
      if (!projection) return;
      counts[projection.status] += 1;
    });

    return counts;
  }, [platformEntries, filters.platform]);

  const entries = useMemo(() => {
    let filtered = platformEntries;

    if (filters.q) {
      const query = filters.q.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.game.title.toLowerCase().includes(query) ||
          entry.game.titleId.toLowerCase().includes(query) ||
          entry.game.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    if (filters.status) {
      filtered = filtered.filter(
        (entry) => getEntryProjection(entry, filters.platform)?.status === filters.status,
      );
    }

    if (filters.perf !== "all") {
      filtered = filtered.filter(
        (entry) => getEntryProjection(entry, filters.platform)?.perf === filters.perf,
      );
    }

    if (filters.platform !== "all" && filters.device) {
      const group = deviceGroups.find(([display]) => display === filters.device);
      const rawValues = group ? group[1] : [filters.device];
      filtered = filtered.filter((entry) => {
        const projection = getEntryProjection(entry, filters.platform);
        return Boolean(
          projection?.observedDevices.some((device) => rawValues.includes(device)),
        );
      });
    }

    const sorted = [...filtered];
    if (filters.sort === "alpha") {
      sorted.sort((left, right) => left.game.title.localeCompare(right.game.title));
    } else {
      sorted.sort((left, right) => {
        const dateDelta =
          entryUpdatedAtMs(right, filters.platform) - entryUpdatedAtMs(left, filters.platform);
        if (dateDelta !== 0) {
          return dateDelta;
        }
        return left.game.title.localeCompare(right.game.title);
      });
    }

    return sorted;
  }, [platformEntries, deviceGroups, filters]);

  const hasFilter =
    filters.platform !== "all" ||
    Boolean(filters.q) ||
    filters.status !== null ||
    filters.perf !== "all" ||
    Boolean(filters.device);

  const handlePlatformChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const platform = parsePlatform(event.target.value);
      router.push(
        `/compatibility${buildQueryString({
          ...filters,
          platform,
          device: "",
        })}`,
      );
    },
    [filters, router],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const nextFilters: FilterState = {
        platform: filters.platform,
        q: ((formData.get("q") as string) ?? "").trim(),
        status: filters.status,
        perf: parsePerf(formData.get("perf") as string),
        device:
          filters.platform === "all"
            ? ""
            : ((formData.get("device") as string) ?? "").trim(),
        sort: parseSort(formData.get("sort") as string),
      };
      router.push(`/compatibility${buildQueryString(nextFilters)}`);
    },
    [filters, router],
  );

  const heroCountLabel =
    filters.platform === "all"
      ? `${baseTotal} ${baseTotal === 1 ? "game" : "games"} tracked`
      : `${baseTotal} ${baseTotal === 1 ? "game" : "games"} with ${getPlatformLabel(
          filters.platform,
        )} release evidence`;

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
              <Pill variant="tag">{getPlatformFilterLabel(filters.platform)}</Pill>
              {totalHiddenReports > 0 ? (
                <Pill variant="tag">{totalHiddenReports} filtered reports</Pill>
              ) : null}
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted">
            Public status uses the latest official release when known. Choose a platform to switch
            the release-facing verdict. Device filtering becomes platform-specific once iOS or
            macOS is selected.
          </p>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted">
            XeniOS is still alpha software. Reports describe what happened on specific
            devices and builds, not a guarantee of a smooth or complete experience.
            Even a playable label should be read as current evidence, not a promise of
            perfection.
          </p>

          {totalHiddenReports > 0 ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted">
              Conflicting platform metadata is hidden from the public list until it is corrected.
            </p>
          ) : null}

          {filters.platform !== "all" ? (
            <p className="mt-3 text-sm text-text-muted">{totalTracked} games tracked overall.</p>
          ) : null}
        </div>
      </section>

      <section className="border-b border-border px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 text-sm text-text-muted">
            {filters.platform === "all"
              ? "Select iOS or macOS to narrow the list by device."
              : deviceCount > 0
                ? `${deviceCount} devices represented in ${getPlatformLabel(filters.platform)} release evidence`
                : `No ${getPlatformLabel(filters.platform)} release-track device evidence yet`}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SUMMARY_STATUS_ORDER.map((status) => {
              const count = statusCounts[status];
              const pct = baseTotal > 0 ? (count / baseTotal) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_COLORS[status]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {getStatusLabel(status)}
                      </span>
                      <span className="text-sm text-text-muted">
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-bg-surface-2">
                      <div
                        className={`h-1.5 rounded-full ${STATUS_COLORS[status]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/compatibility${buildQueryString({ ...filters, status: null })}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary ${
              filters.status === null
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-bg-surface text-text-secondary hover:text-text-primary"
            }`}
          >
            All ({baseTotal})
          </Link>
          {SUMMARY_STATUS_ORDER.map((status) => {
            const nextStatus = filters.status === status ? null : status;
            return (
              <Link
                key={status}
                href={`/compatibility${buildQueryString({ ...filters, status: nextStatus })}`}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary ${
                  filters.status === status
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-bg-surface text-text-secondary hover:text-text-primary"
                }`}
              >
                {getStatusLabel(status)} ({statusCounts[status]})
              </Link>
            );
          })}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
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
              name="q"
              placeholder="Search by title, title ID, or tag..."
              defaultValue={filters.q}
              key={filters.q}
              aria-label="Search games"
              className="w-full rounded-lg border border-border bg-bg-surface py-2.5 pl-10 pr-4 text-base text-text-primary placeholder-text-muted outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={filters.platform}
              onChange={handlePlatformChange}
              aria-label="Filter by platform"
              className="rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent/40"
            >
              <option value="all">All Platforms</option>
              <option value="ios">iOS</option>
              <option value="macos">macOS</option>
            </select>

            <select
              name="perf"
              defaultValue={filters.perf}
              key={`perf-${filters.perf}`}
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
              name="device"
              defaultValue={filters.device}
              key={`device-${filters.platform}-${filters.device}`}
              aria-label="Filter by device"
              disabled={filters.platform === "all"}
              className="rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent/40 disabled:cursor-not-allowed disabled:text-text-muted"
            >
              <option value="">
                {filters.platform === "all" ? "Select Platform First" : "All Devices"}
              </option>
              {deviceGroups.map(([display]) => (
                <option key={display} value={display}>
                  {display}
                </option>
              ))}
            </select>

            <select
              name="sort"
              defaultValue={filters.sort}
              key={`sort-${filters.sort}`}
              aria-label="Sort order"
              className="rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent/40"
            >
              <option value="updated">Recently Updated</option>
              <option value="alpha">Alphabetical</option>
            </select>

            <button
              type="submit"
              className="rounded-lg border border-border bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-surface-2"
            >
              Apply
            </button>

            <Link
              href="/compatibility"
              className="rounded-lg border border-border bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-bg-surface-2 hover:text-text-primary"
            >
              Reset
            </Link>
          </div>
        </form>

        <p className="mt-4 text-sm text-text-muted">
          {entries.length} {entries.length === 1 ? "game" : "games"}
          {hasFilter ? " matching filters" : ""}
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
        <div className="hidden overflow-x-auto rounded-xl border border-border bg-bg-surface md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-text-muted">
                <th className="py-3 pr-4 pl-4">Title ID</th>
                <th className="py-3 pr-4">Title</th>
                <th className="py-3 pr-4">Platforms</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Perf</th>
                <th className="py-3 pr-4">Observed On</th>
                <th className="py-3 pr-4">Updated</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <GameRow key={entry.game.slug} entry={entry} platform={filters.platform} />
              ))}
            </tbody>
          </table>

          {entries.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-text-muted">
              No games match the current filters.
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 md:hidden">
          {entries.map((entry) => (
            <GameCard key={entry.game.slug} entry={entry} platform={filters.platform} />
          ))}

          {entries.length === 0 ? (
            <div className="rounded-lg border border-border bg-bg-surface px-6 py-12 text-center text-sm text-text-muted">
              No games match the current filters.
            </div>
          ) : null}
        </div>
      </div>

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

export function CompatibilityList({
  entries,
}: {
  entries: CompatibilityListEntry[];
}) {
  return (
    <Suspense>
      <CompatibilityListInner entries={entries} />
    </Suspense>
  );
}
