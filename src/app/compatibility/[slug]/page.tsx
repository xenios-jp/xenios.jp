import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllGames,
  getGameBySlug,
  getBestReport,
  deviceName,
  type GameStatus,
  type PerfTier,
  type GpuBackend,
} from "@/lib/compatibility";
import { EMULATOR_GITHUB_COMPATIBILITY_REPORT_URL } from "@/lib/constants";
import { Pill } from "@/components/pill";
import { getDiscussionByTitleId } from "@/lib/discussions";

/* ------------------------------------------------------------------ */
/*  Static params                                                      */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return getAllGames().map((game) => ({ slug: game.slug }));
}

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) return { title: "Game Not Found" };

  return {
    title: `${game.title} — Compatibility`,
    description: `XeniOS compatibility report for ${game.title} (${game.titleId}). Status: ${game.status}.`,
  };
}

/* ------------------------------------------------------------------ */
/*  Label helpers                                                      */
/* ------------------------------------------------------------------ */

function statusLabel(status: GameStatus): string {
  const map: Record<GameStatus, string> = {
    playable: "Playable",
    ingame: "In-Game",
    intro: "Intro",
    loads: "Loads",
    nothing: "Nothing",
  };
  return map[status];
}

function perfLabel(perf: PerfTier): string {
  const map: Record<PerfTier, string> = {
    great: "Great",
    ok: "OK",
    poor: "Poor",
    "n/a": "N/A",
  };
  return map[perf];
}

function gpuLabel(gpu: GpuBackend): string {
  const map: Record<GpuBackend, string> = {
    msc: "MSC",
    msl: "MSL",
  };
  return map[gpu];
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = getGameBySlug(slug);

  if (!game) notFound();
  const discussion = getDiscussionByTitleId(game.titleId);

  const hasTags = game.tags.length > 0;
  const bestReport = getBestReport(game);
  const showDetails = hasTags || bestReport;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <section className="hero-gradient border-b border-border px-4 pt-20 pb-12 md:pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumb */}
          <nav className="mb-6 text-[15px] leading-relaxed text-text-muted">
            <Link
              href="/compatibility"
              className="transition hover:text-accent"
            >
              Compatibility
            </Link>
            <span className="mx-2">/</span>
            <span className="text-text-primary">{game.title}</span>
          </nav>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
                {game.title}
              </h1>
              <p className="mt-1 font-mono text-[15px] leading-relaxed text-text-muted">
                Title ID: {game.titleId}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill variant={game.status}>{statusLabel(game.status)}</Pill>
              {game.perf !== "n/a" && (
                <Pill variant={game.perf}>{perfLabel(game.perf)}</Pill>
              )}
            </div>
          </div>

          <p className="mt-3 text-[15px] leading-relaxed text-text-muted">
            Last updated: {game.updatedAt}
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-6 md:py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          {/* GitHub Discussion — most important, shown first */}
          {discussion ? (
            <section className="rounded-xl border border-border bg-bg-surface p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-text-primary">
                  Discussion
                </h2>
                <a
                  href={discussion.issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-accent transition hover:text-accent-hover"
                >
                  View Issue #{discussion.issueNumber}
                </a>
              </div>

              {discussion.entries.length > 0 ? (
                <div className="mt-4 flex flex-col gap-3">
                  {discussion.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-border bg-bg-primary p-5"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-text-primary">
                          @{entry.author} · Issue #{entry.issueNumber}
                          {entry.type === "issue" ? " · Original report" : ""}
                        </span>
                        <span className="shrink-0 text-xs text-text-muted">{entry.createdAt}</span>
                      </div>
                      <p className="whitespace-pre-line text-[15px] leading-relaxed text-text-secondary">
                        {entry.excerpt}
                      </p>
                      {Object.keys(entry.meta).length > 0 ? (
                        <p className="mt-1.5 text-xs text-text-muted">
                          {[
                            entry.meta.status && statusLabel(entry.meta.status as GameStatus),
                            entry.meta.device && deviceName(entry.meta.device),
                            entry.meta.osVersion,
                            entry.meta.gpuBackend,
                          ].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                      {entry.images.length > 0 ? (
                        <div className={`mt-3 grid gap-3 ${entry.images.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                          {entry.images.map((url) => (
                            <a
                              key={`${entry.id}-${url}`}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="overflow-hidden rounded-lg border border-border bg-bg-surface transition hover:border-accent/40"
                            >
                              <img
                                src={url}
                                alt={`GitHub attachment for ${game.title}`}
                                className="max-h-72 w-full rounded-lg object-contain"
                              />
                            </a>
                          ))}
                        </div>
                      ) : null}
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm text-accent transition hover:text-accent-hover"
                      >
                        {entry.type === "issue" ? "Open issue" : "Open comment"}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-[15px] leading-relaxed text-text-muted">
                  No discussion entries yet.
                </p>
              )}
            </section>
          ) : null}

          {/* Details — only shown if there are tags or non-N/A settings */}
          {showDetails ? (
            <section className="rounded-xl border border-border bg-bg-surface p-8">
              <h2 className="mb-4 text-xl font-semibold text-text-primary">
                Details
              </h2>

              {hasTags ? (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Known Issues</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {game.tags.map((tag) => (
                      <Pill key={tag} variant="tag">
                        {tag}
                      </Pill>
                    ))}
                  </div>
                </div>
              ) : null}

              {bestReport ? (
                <div className={hasTags ? "mt-6" : ""}>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Best Result</h3>
                  <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border border-border bg-bg-primary p-5">
                      <p className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                        Status
                      </p>
                      <div className="mt-1">
                        <Pill variant={bestReport.status}>{statusLabel(bestReport.status)}</Pill>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-primary p-5">
                      <p className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                        Device
                      </p>
                      <p className="mt-1 text-lg font-medium text-text-primary">
                        {deviceName(bestReport.device)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-primary p-5">
                      <p className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                        Platform
                      </p>
                      <p className="mt-1 text-lg font-medium text-text-primary">
                        {bestReport.platform === "ios" ? "iOS" : "macOS"} {bestReport.osVersion}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-primary p-5">
                      <p className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                        GPU
                      </p>
                      <p className="mt-1 text-lg font-medium text-text-primary">
                        {gpuLabel(bestReport.gpuBackend)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-text-muted">
                    Based on the highest-status report from {bestReport.date}.
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Submit Report CTA */}
          <section className="rounded-xl border border-accent/20 bg-accent/[0.04] p-8 text-center">
            <h2 className="mb-2 text-xl font-semibold text-text-primary">
              Tested this game?
            </h2>
            <p className="mt-2 mb-4 text-[15px] leading-relaxed text-text-secondary">
              Help the community by submitting a compatibility report for{" "}
              {game.title}.
            </p>
            <a
              href={EMULATOR_GITHUB_COMPATIBILITY_REPORT_URL}
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
    </div>
  );
}
