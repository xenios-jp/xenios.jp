"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { type GameStatus, type PerfTier, type Game } from "@/lib/compatibility";
import { Pill } from "@/components/pill";

type SortKey = "updated" | "alpha";

interface FilterState {
  q: string;
  status: GameStatus | null;
  perf: PerfTier | "all";
  sort: SortKey;
}

const STATUS_ORDER: GameStatus[] = [
  "playable",
  "ingame",
  "intro",
  "loads",
  "nothing",
];

const STATUS_LABELS: Record<GameStatus, string> = {
  playable: "Playable",
  ingame: "In-Game",
  intro: "Intro",
  loads: "Loads",
  nothing: "Doesn't Boot",
};

const STATUS_COLORS: Record<GameStatus, string> = {
  playable: "bg-emerald-400",
  ingame: "bg-blue-400",
  intro: "bg-amber-400",
  loads: "bg-orange-400",
  nothing: "bg-red-400",
};

const STATUS_DOT_COLORS: Record<GameStatus, string> = {
  playable: "bg-emerald-400",
  ingame: "bg-blue-400",
  intro: "bg-amber-400",
  loads: "bg-orange-400",
  nothing: "bg-red-400",
};

const PERF_LABELS: Record<PerfTier, string> = {
  great: "Great",
  ok: "OK",
  poor: "Poor",
  "n/a": "N/A",
};

function parseStatus(value: string | null): GameStatus | null {
  if (!value) return null;
  return STATUS_ORDER.includes(value as GameStatus)
    ? (value as GameStatus)
    : null;
}

function parsePerf(value: string | null): PerfTier | "all" {
  if (value === "great" || value === "ok" || value === "poor" || value === "n/a")
    return value;
  return "all";
}

function parseSort(value: string | null): SortKey {
  return value === "alpha" ? "alpha" : "updated";
}

function buildQueryString(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.perf !== "all") params.set("perf", filters.perf);
  if (filters.sort !== "updated") params.set("sort", filters.sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function gameUpdatedAtMs(game: Game): number {
  const timestamp = new Date(game.updatedAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function GameRow({ game }: { game: Game }) {
  return (
    <tr className="border-b border-border transition hover:bg-bg-surface/60">
      <td className="py-2.5 pr-4 pl-4 font-mono text-sm text-text-muted">
        <Link
          href={`/compatibility/${game.slug}`}
          className="transition hover:text-accent"
        >
          {game.titleId}
        </Link>
      </td>
      <td className="py-2.5 pr-4">
        <Link
          href={`/compatibility/${game.slug}`}
          className="font-medium text-text-primary transition hover:text-accent"
        >
          {game.title}
        </Link>
      </td>
      <td className="py-2.5 pr-4">
        <Pill variant={game.status}>{STATUS_LABELS[game.status]}</Pill>
      </td>
      <td className="py-2.5 pr-4">
        <Pill variant={game.perf}>{PERF_LABELS[game.perf]}</Pill>
      </td>
      <td className="py-2.5 pr-4 text-sm text-text-secondary">
        {game.lastReport.device}
      </td>
      <td className="py-2.5 pr-4 text-sm text-text-muted">{game.updatedAt}</td>
    </tr>
  );
}

function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/compatibility/${game.slug}`}
      className="block rounded-lg border border-border bg-bg-surface p-4 transition hover:border-accent/20"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-text-primary">{game.title}</h3>
          <span className="font-mono text-xs text-text-muted">
            {game.titleId}
          </span>
        </div>
        <Pill variant={game.status}>{STATUS_LABELS[game.status]}</Pill>
      </div>
      <div className="flex items-center justify-between text-sm text-text-muted">
        <span>{game.lastReport.device}</span>
        <span>{game.updatedAt}</span>
      </div>
    </Link>
  );
}

function CompatibilityListInner({ games: allGames }: { games: Game[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters: FilterState = useMemo(
    () => ({
      q: (searchParams.get("q") ?? "").trim(),
      status: parseStatus(searchParams.get("status")),
      perf: parsePerf(searchParams.get("perf")),
      sort: parseSort(searchParams.get("sort")),
    }),
    [searchParams],
  );

  const total = allGames.length;
  const deviceCount = useMemo(
    () => new Set(allGames.map((game) => game.lastReport.device)).size,
    [allGames],
  );

  const statusCounts: Record<GameStatus, number> = useMemo(() => {
    const counts: Record<GameStatus, number> = {
      playable: 0,
      ingame: 0,
      intro: 0,
      loads: 0,
      nothing: 0,
    };
    allGames.forEach((game) => {
      counts[game.status] += 1;
    });
    return counts;
  }, [allGames]);

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
      filtered = filtered.filter((game) => game.status === filters.status);
    }

    if (filters.perf !== "all") {
      filtered = filtered.filter((game) => game.perf === filters.perf);
    }

    const sorted = [...filtered];
    if (filters.sort === "alpha") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => gameUpdatedAtMs(b) - gameUpdatedAtMs(a));
    }

    return sorted;
  }, [allGames, filters]);

  const hasFilter =
    Boolean(filters.q) || filters.status !== null || filters.perf !== "all";

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const newFilters: FilterState = {
        q: ((formData.get("q") as string) ?? "").trim(),
        status: filters.status,
        perf: parsePerf(formData.get("perf") as string),
        sort: parseSort(formData.get("sort") as string),
      };
      router.push(`/compatibility${buildQueryString(newFilters)}`);
    },
    [filters.status, router],
  );

  return (
    <div className="min-h-screen bg-bg-primary">
      <section className="hero-gradient border-b border-border px-4 pt-20 pb-10 sm:px-6 md:pb-12 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Compatibility
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            {total} games tested across {deviceCount} devices
          </p>
        </div>
      </section>

      <section className="border-b border-border px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            {STATUS_ORDER.map((status) => {
              const count = statusCounts[status];
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT_COLORS[status]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {STATUS_LABELS[status]}
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
          {STATUS_ORDER.map((status) => {
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
                {STATUS_LABELS[status]} ({statusCounts[status]})
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
          {games.length} {games.length === 1 ? "game" : "games"}
          {hasFilter ? " matching filters" : ""}
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6 lg:px-8">
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
                <GameRow key={game.slug} game={game} />
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
            <GameCard key={game.slug} game={game} />
          ))}

          {games.length === 0 ? (
            <div className="rounded-lg border border-border bg-bg-surface px-6 py-12 text-center text-sm text-text-muted">
              No games match the current filters.
            </div>
          ) : null}
        </div>
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
