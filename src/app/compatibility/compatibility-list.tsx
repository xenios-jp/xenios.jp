"use client";

import type { FormEvent } from "react";
import { Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pill } from "@/components/pill";
import {
  COMPATIBILITY_CHANNELS,
  SUMMARY_STATUS_ORDER,
  deviceName,
  getActiveSummary,
  getCompatibilityChannelLabel,
  getPerfLabel,
  getReportsForChannel,
  getStatusLabel,
  parseCompatibilityChannel,
  type CompatibilityChannel,
  type Game,
  type PerfTier,
  type SummaryStatus,
} from "@/lib/compatibility";
import { COMPATIBILITY_TRACKER_REPORT_URL } from "@/lib/constants";

type SortKey = "updated" | "alpha";

interface FilterState {
  channel: CompatibilityChannel;
  q: string;
  status: SummaryStatus | null;
  perf: PerfTier | "all";
  device: string;
  sort: SortKey;
}

const STATUS_COLORS: Record<SummaryStatus, string> = {
  playable: "bg-emerald-400",
  ingame: "bg-blue-400",
  intro: "bg-amber-400",
  loads: "bg-orange-400",
  nothing: "bg-red-400",
  untested: "bg-zinc-400",
};

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
  if (filters.channel !== "release") params.set("channel", filters.channel);
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.perf !== "all") params.set("perf", filters.perf);
  if (filters.device) params.set("device", filters.device);
  if (filters.sort !== "updated") params.set("sort", filters.sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function gameHref(slug: string, channel: CompatibilityChannel): string {
  if (channel === "release") return `/compatibility/${slug}`;
  return `/compatibility/${slug}?channel=${channel}`;
}

function summaryUpdatedAtMs(game: Game, channel: CompatibilityChannel): number {
  const timestamp = new Date(getActiveSummary(game, channel).updatedAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function summaryDeviceLabel(game: Game, channel: CompatibilityChannel): string {
  const summary = getActiveSummary(game, channel);
  return summary.lastReport ? deviceName(summary.lastReport.device) : "Untested";
}

function summaryUpdatedLabel(game: Game, channel: CompatibilityChannel): string {
  const summary = getActiveSummary(game, channel);
  return summary.updatedAt || "No reports yet";
}

function GameRow({
  game,
  channel,
}: {
  game: Game;
  channel: CompatibilityChannel;
}) {
  const summary = getActiveSummary(game, channel);

  return (
    <tr className="border-b border-border transition hover:bg-bg-surface/60">
      <td className="py-2.5 pr-4 pl-4 font-mono text-sm text-text-muted">
        <Link
          href={gameHref(game.slug, channel)}
          className="transition hover:text-accent"
        >
          {game.titleId}
        </Link>
      </td>
      <td className="py-2.5 pr-4">
        <Link
          href={gameHref(game.slug, channel)}
          className="font-medium text-text-primary transition hover:text-accent"
        >
          {game.title}
        </Link>
      </td>
      <td className="py-2.5 pr-4">
        <Pill variant={summary.status}>{getStatusLabel(summary.status)}</Pill>
      </td>
      <td className="py-2.5 pr-4">
        <Pill variant={summary.perf}>{getPerfLabel(summary.perf)}</Pill>
      </td>
      <td className="py-2.5 pr-4 text-sm text-text-secondary">
        {summaryDeviceLabel(game, channel)}
      </td>
      <td className="py-2.5 pr-4 text-sm text-text-muted">
        {summaryUpdatedLabel(game, channel)}
      </td>
    </tr>
  );
}

function GameCard({
  game,
  channel,
}: {
  game: Game;
  channel: CompatibilityChannel;
}) {
  const summary = getActiveSummary(game, channel);

  return (
    <Link
      href={gameHref(game.slug, channel)}
      className="block rounded-lg border border-border bg-bg-surface p-4 transition hover:border-accent/20"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-text-primary">{game.title}</h3>
          <span className="font-mono text-xs text-text-muted">
            {game.titleId}
          </span>
        </div>
        <Pill variant={summary.status}>{getStatusLabel(summary.status)}</Pill>
      </div>
      <div className="flex items-center justify-between text-sm text-text-muted">
        <span>{summaryDeviceLabel(game, channel)}</span>
        <span>{summaryUpdatedLabel(game, channel)}</span>
      </div>
    </Link>
  );
}

function CompatibilityListInner({ games: allGames }: { games: Game[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters: FilterState = useMemo(
    () => ({
      channel: parseCompatibilityChannel(searchParams.get("channel")),
      q: (searchParams.get("q") ?? "").trim(),
      status: parseStatus(searchParams.get("status")),
      perf: parsePerf(searchParams.get("perf")),
      device: searchParams.get("device") ?? "",
      sort: parseSort(searchParams.get("sort")),
    }),
    [searchParams],
  );

  const total = allGames.length;

  const deviceGroups = useMemo(() => {
    const allRaw = [
      ...new Set(
        allGames.flatMap((game) =>
          getReportsForChannel(game, filters.channel).map((report) => report.device),
        ),
      ),
    ];

    const groups = new Map<string, string[]>();
    for (const raw of allRaw) {
      const display = deviceName(raw);
      const existing = groups.get(display) || [];
      existing.push(raw);
      groups.set(display, existing);
    }

    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [allGames, filters.channel]);

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

    allGames.forEach((game) => {
      counts[getActiveSummary(game, filters.channel).status] += 1;
    });

    return counts;
  }, [allGames, filters.channel]);

  const games = useMemo(() => {
    let filtered = allGames;

    if (filters.q) {
      const query = filters.q.toLowerCase();
      filtered = filtered.filter(
        (game) =>
          game.title.toLowerCase().includes(query) ||
          game.titleId.toLowerCase().includes(query) ||
          game.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    if (filters.status) {
      filtered = filtered.filter(
        (game) => getActiveSummary(game, filters.channel).status === filters.status,
      );
    }

    if (filters.perf !== "all") {
      filtered = filtered.filter(
        (game) => getActiveSummary(game, filters.channel).perf === filters.perf,
      );
    }

    if (filters.device) {
      const group = deviceGroups.find(([display]) => display === filters.device);
      const rawValues = group ? group[1] : [filters.device];
      filtered = filtered.filter((game) =>
        getReportsForChannel(game, filters.channel).some((report) =>
          rawValues.includes(report.device),
        ),
      );
    }

    const sorted = [...filtered];
    if (filters.sort === "alpha") {
      sorted.sort((left, right) => left.title.localeCompare(right.title));
    } else {
      sorted.sort(
        (left, right) =>
          summaryUpdatedAtMs(right, filters.channel) - summaryUpdatedAtMs(left, filters.channel),
      );
    }

    return sorted;
  }, [allGames, deviceGroups, filters]);

  const hasFilter =
    Boolean(filters.q) ||
    filters.status !== null ||
    filters.perf !== "all" ||
    Boolean(filters.device);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const nextFilters: FilterState = {
        channel: filters.channel,
        q: ((formData.get("q") as string) ?? "").trim(),
        status: filters.status,
        perf: parsePerf(formData.get("perf") as string),
        device: (formData.get("device") as string) ?? "",
        sort: parseSort(formData.get("sort") as string),
      };
      router.push(`/compatibility${buildQueryString(nextFilters)}`);
    },
    [filters.channel, filters.status, router],
  );

  return (
    <div className="min-h-screen bg-bg-primary">
      <section className="hero-gradient border-b border-border px-4 pt-20 pb-10 sm:px-6 md:pb-12 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
                Compatibility
              </h1>
              <p className="mt-2 text-lg text-text-secondary">
                {total} games tracked • {getCompatibilityChannelLabel(filters.channel)} view
              </p>
            </div>

            <div className="inline-flex rounded-full border border-border bg-bg-surface p-1">
              {COMPATIBILITY_CHANNELS.map((channel) => {
                const active = filters.channel === channel;
                return (
                  <Link
                    key={channel}
                    href={`/compatibility${buildQueryString({ ...filters, channel })}`}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-accent text-accent-fg"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {getCompatibilityChannelLabel(channel)}
                  </Link>
                );
              })}
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted">
            Release is the public default. Preview reports stay visible here,
            but they no longer overwrite the release-facing answer.
          </p>
        </div>
      </section>

      <section className="border-b border-border px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 text-sm text-text-muted">
            {deviceCount > 0
              ? `${deviceCount} devices represented in this view`
              : "No device reports yet in this view"}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SUMMARY_STATUS_ORDER.map((status) => {
              const count = statusCounts[status];
              const pct = total > 0 ? (count / total) * 100 : 0;
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
            All ({total})
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
              key={`device-${filters.device}`}
              aria-label="Filter by device"
              className="rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent/40"
            >
              <option value="">All Devices</option>
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
              href={filters.channel === "release" ? "/compatibility" : `/compatibility?channel=${filters.channel}`}
              className="rounded-lg border border-border bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-bg-surface-2 hover:text-text-primary"
            >
              Reset
            </Link>
          </div>
        </form>

        <p className="mt-4 text-sm text-text-muted">
          {games.length} {games.length === 1 ? "game" : "games"}
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
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Perf</th>
                <th className="py-3 pr-4">Device</th>
                <th className="py-3 pr-4">Updated</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <GameRow key={game.slug} game={game} channel={filters.channel} />
              ))}
            </tbody>
          </table>

          {games.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-text-muted">
              No games match the current filters.
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 md:hidden">
          {games.map((game) => (
            <GameCard key={game.slug} game={game} channel={filters.channel} />
          ))}

          {games.length === 0 ? (
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

export function CompatibilityList({ games }: { games: Game[] }) {
  return (
    <Suspense>
      <CompatibilityListInner games={games} />
    </Suspense>
  );
}
