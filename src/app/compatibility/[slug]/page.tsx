import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllGames,
  getGameBySlug,
  type GameStatus,
  type PerfTier,
  type Platform,
  type Architecture,
  type GpuBackend,
} from "@/lib/compatibility";
import { EMULATOR_GITHUB_COMPATIBILITY_REPORT_URL } from "@/lib/constants";
import { Pill } from "@/components/pill";

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
    nothing: "Doesn't Boot",
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

function platformLabel(platform: Platform): string {
  const map: Record<Platform, string> = {
    ios: "iOS",
    macos: "macOS",
  };
  return map[platform];
}

function archLabel(arch: Architecture): string {
  const map: Record<Architecture, string> = {
    arm64: "ARM64",
    x86_64: "x86_64",
  };
  return map[arch];
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

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <section className="hero-gradient border-b border-border px-4 pt-16 pb-12 md:pt-20 md:pb-14 sm:px-6 lg:px-8">
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
              {game.platforms.map((p) => (
                <Pill key={p} variant={p}>{platformLabel(p)}</Pill>
              ))}
              <Pill variant={game.status}>{statusLabel(game.status)}</Pill>
              <Pill variant={game.perf}>{perfLabel(game.perf)}</Pill>
            </div>
          </div>

          <p className="mt-3 text-[15px] leading-relaxed text-text-muted">
            Last updated: {game.updatedAt}
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-10 md:py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          {/* Notes */}
          <section className="rounded-xl border border-border bg-bg-surface p-8">
            <h2 className="mb-3 text-xl font-semibold text-text-primary">Notes</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
              {game.notes}
            </p>
          </section>

          {/* Known Issues / Tags */}
          <section className="rounded-xl border border-border bg-bg-surface p-8">
            <h2 className="mb-3 text-xl font-semibold text-text-primary">
              Known Issues
            </h2>
            {game.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {game.tags.map((tag) => (
                  <Pill key={tag} variant="tag">
                    {tag}
                  </Pill>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-[15px] leading-relaxed text-text-muted">
                No known issues tagged for this title.
              </p>
            )}
          </section>

          {/* Recommended Settings */}
          <section className="rounded-xl border border-border bg-bg-surface p-8">
            <h2 className="mb-4 text-xl font-semibold text-text-primary">
              Recommended Settings
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-bg-primary p-5">
                <p className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Resolution
                </p>
                <p className="mt-1 text-lg font-medium text-text-primary">
                  {game.recommendedSettings.resolution}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary p-5">
                <p className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Framerate
                </p>
                <p className="mt-1 text-lg font-medium text-text-primary">
                  {game.recommendedSettings.framerate}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary p-5">
                <p className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Device
                </p>
                <p className="mt-1 text-lg font-medium text-text-primary">
                  {game.lastReport.device}
                </p>
              </div>
            </div>
          </section>

          {/* Report History */}
          <section className="rounded-xl border border-border bg-bg-surface p-8">
            <h2 className="mb-4 text-xl font-semibold text-text-primary">
              Report History
            </h2>

            {/* Desktop table */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-[15px] leading-relaxed">
                <thead>
                  <tr className="border-b border-border text-sm font-semibold uppercase tracking-wider text-text-muted">
                    <th className="pb-4 pr-4">Date</th>
                    <th className="pb-4 pr-4">Device</th>
                    <th className="pb-4 pr-4">Platform</th>
                    <th className="pb-4 pr-4">OS</th>
                    <th className="pb-4 pr-4">GPU</th>
                    <th className="pb-4 pr-4">Status</th>
                    <th className="pb-4">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {game.reports.map((report, i) => (
                    <tr
                      key={i}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-4 pr-4 text-text-secondary">
                        {report.date}
                      </td>
                      <td className="py-4 pr-4 text-text-primary">
                        {report.device}
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-1">
                          <Pill variant={report.platform}>
                            {platformLabel(report.platform)}
                          </Pill>
                          <span className="text-xs text-text-muted">{archLabel(report.arch)}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-text-secondary">{report.osVersion}</td>
                      <td className="py-4 pr-4">
                        <Pill variant={report.gpuBackend}>
                          {gpuLabel(report.gpuBackend)}
                        </Pill>
                      </td>
                      <td className="py-4 pr-4">
                        <Pill variant={report.status}>
                          {statusLabel(report.status)}
                        </Pill>
                      </td>
                      <td className="py-4 text-text-secondary">{report.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="mt-4 flex flex-col gap-3 sm:hidden">
              {game.reports.map((report, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-bg-primary p-5"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[15px] leading-relaxed font-medium text-text-primary">
                      {report.device}
                    </span>
                    <Pill variant={report.status}>
                      {statusLabel(report.status)}
                    </Pill>
                  </div>
                  <p className="mb-2 text-[15px] leading-relaxed text-text-secondary">{report.notes}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
                    <Pill variant={report.platform}>{platformLabel(report.platform)}</Pill>
                    <span>{report.osVersion}</span>
                    <Pill variant={report.gpuBackend}>{gpuLabel(report.gpuBackend)}</Pill>
                    <span>{report.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

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
