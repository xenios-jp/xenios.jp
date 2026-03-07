"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Pill } from "@/components/pill";
import type { DiscussionData } from "@/lib/discussions";
import {
  COMPATIBILITY_CHANNELS,
  deviceName,
  formatReportBuildLabel,
  getActiveSummary,
  getBestReport,
  getCompatibilityChannelLabel,
  getGpuLabel,
  getPerfLabel,
  getPlatformLabel,
  getReportChannelLabel,
  getReportsForChannel,
  getStatusLabel,
  parseCompatibilityChannel,
  type CompatibilityChannel,
  type Game,
  type SummaryStatus,
} from "@/lib/compatibility";
import { COMPATIBILITY_TRACKER_REPORT_URL } from "@/lib/constants";

function buildChannelHref(slug: string, channel: CompatibilityChannel): string {
  if (channel === "release") return `/compatibility/${slug}`;
  return `/compatibility/${slug}?channel=${channel}`;
}

function statusDescription(status: SummaryStatus): string {
  if (status === "untested") {
    return "No reports yet for this channel. Switch views to inspect Preview or historical results.";
  }
  return `${getStatusLabel(status)} is currently the best reported result in this view.`;
}

export function GameDetailClient({
  game,
  discussion,
}: {
  game: Game;
  discussion: DiscussionData | null;
}) {
  const searchParams = useSearchParams();
  const channel = parseCompatibilityChannel(searchParams.get("channel"));
  const summary = getActiveSummary(game, channel);
  const reports = getReportsForChannel(game, channel);
  const bestReport = getBestReport(game, channel);
  const hasTags = game.tags.length > 0;
  const bestReportPerf =
    bestReport?.perf ?? (bestReport?.status === "nothing" ? "n/a" : "ok");

  return (
    <div className="min-h-screen bg-bg-primary">
      <section className="hero-gradient border-b border-border px-4 pt-20 pb-12 sm:px-6 md:pb-14 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <nav className="mb-6 text-[15px] leading-relaxed text-text-muted">
            <Link href="/compatibility" className="transition hover:text-accent">
              Compatibility
            </Link>
            <span className="mx-2">/</span>
            <span className="text-text-primary">{game.title}</span>
          </nav>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
                {game.title}
              </h1>
              <p className="mt-1 font-mono text-[15px] leading-relaxed text-text-muted">
                Title ID: {game.titleId}
              </p>
            </div>

            <div className="inline-flex rounded-full border border-border bg-bg-surface p-1">
              {COMPATIBILITY_CHANNELS.map((entry) => {
                const active = entry === channel;
                return (
                  <Link
                    key={entry}
                    href={buildChannelHref(game.slug, entry)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-accent text-accent-fg"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {getCompatibilityChannelLabel(entry)}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Pill variant={summary.status}>{getStatusLabel(summary.status)}</Pill>
            <Pill variant={summary.perf}>{getPerfLabel(summary.perf)}</Pill>
            {summary.build?.channel ? (
              <Pill variant={summary.build.channel}>
                {getReportChannelLabel(summary.build.channel)}
              </Pill>
            ) : null}
          </div>

          <p className="mt-3 text-[15px] leading-relaxed text-text-muted">
            {getCompatibilityChannelLabel(channel)} view
            {summary.updatedAt ? ` • updated ${summary.updatedAt}` : " • no reports yet"}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
        <div className="flex flex-col gap-8">
          {discussion ? (
            <section className="rounded-xl border border-border bg-bg-surface p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-text-primary">Discussion</h2>
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
                        <span className="shrink-0 text-xs text-text-muted">
                          {entry.createdAt}
                        </span>
                      </div>
                      <p className="whitespace-pre-line text-[15px] leading-relaxed text-text-secondary">
                        {entry.excerpt}
                      </p>
                      {Object.keys(entry.meta).length > 0 ? (
                        <p className="mt-1.5 text-xs text-text-muted">
                          {[
                            entry.meta.status && getStatusLabel(entry.meta.status as SummaryStatus),
                            entry.meta.device && deviceName(entry.meta.device),
                            entry.meta.osVersion,
                            entry.meta.gpuBackend,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                      {entry.images.length > 0 ? (
                        <div
                          className={`mt-3 grid gap-3 ${
                            entry.images.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
                          }`}
                        >
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

          <section className="rounded-xl border border-border bg-bg-surface p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-text-primary">
                {getCompatibilityChannelLabel(channel)} Summary
              </h2>
              {summary.build ? (
                <span className="text-sm text-text-muted">
                  {formatReportBuildLabel(summary.build)}
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-bg-primary p-5">
                <p className="text-sm font-medium text-text-muted">Status</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Pill variant={summary.status}>{getStatusLabel(summary.status)}</Pill>
                  <Pill variant={summary.perf}>{getPerfLabel(summary.perf)}</Pill>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
                  {statusDescription(summary.status)}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-bg-primary p-5">
                <p className="text-sm font-medium text-text-muted">Coverage</p>
                <p className="mt-2 text-3xl font-semibold text-text-primary">
                  {summary.reportCount}
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
                  Reports included in the {getCompatibilityChannelLabel(channel).toLowerCase()} view.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-bg-primary p-5">
                <p className="text-sm font-medium text-text-muted">Last Updated</p>
                <p className="mt-2 text-3xl font-semibold text-text-primary">
                  {summary.updatedAt ?? "N/A"}
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
                  Latest report date currently surfaced in this view.
                </p>
              </div>
            </div>

            {bestReport ? (
              <div className="mt-6 rounded-lg border border-border bg-bg-primary p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-text-primary">
                    Best Report
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill variant={bestReport.status}>{getStatusLabel(bestReport.status)}</Pill>
                    <Pill variant={bestReportPerf}>{getPerfLabel(bestReportPerf)}</Pill>
                    {bestReport.build?.channel ? (
                      <Pill variant={bestReport.build.channel}>
                        {getReportChannelLabel(bestReport.build.channel)}
                      </Pill>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-text-muted">Platform</p>
                    <p className="mt-1 text-text-primary">
                      {getPlatformLabel(bestReport.platform)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Device</p>
                    <p className="mt-1 text-text-primary">{deviceName(bestReport.device)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">GPU Backend</p>
                    <p className="mt-1 text-text-primary">
                      {getGpuLabel(bestReport.gpuBackend)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Build</p>
                    <p className="mt-1 text-text-primary">
                      {bestReport.build ? formatReportBuildLabel(bestReport.build) : "Unavailable"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-text-secondary">
                  {bestReport.notes}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-bg-surface p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-text-primary">
                  {getCompatibilityChannelLabel(channel)} Reports
                </h2>
                <p className="mt-1 text-[15px] leading-relaxed text-text-muted">
                  Detailed reports attached to this game in the selected view.
                </p>
              </div>
              <a
                href={COMPATIBILITY_TRACKER_REPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
              >
                Submit Report
              </a>
            </div>

            {reports.length > 0 ? (
              <div className="mt-5 flex flex-col gap-4">
                {reports.map((report, index) => {
                  const reportPerf =
                    report.perf ?? (report.status === "nothing" ? "n/a" : "ok");

                  return (
                  <article
                    key={`${report.date}-${report.device}-${index}`}
                    className="rounded-lg border border-border bg-bg-primary p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill variant={report.status}>{getStatusLabel(report.status)}</Pill>
                        <Pill variant={reportPerf}>{getPerfLabel(reportPerf)}</Pill>
                        {report.build?.channel ? (
                          <Pill variant={report.build.channel}>
                            {getReportChannelLabel(report.build.channel)}
                          </Pill>
                        ) : null}
                      </div>
                      <span className="text-sm text-text-muted">{report.date}</span>
                    </div>

                    <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                      <div>
                        <dt className="text-text-muted">Device</dt>
                        <dd className="mt-1 text-text-primary">{deviceName(report.device)}</dd>
                      </div>
                      <div>
                        <dt className="text-text-muted">Platform</dt>
                        <dd className="mt-1 text-text-primary">
                          {getPlatformLabel(report.platform)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-text-muted">OS Version</dt>
                        <dd className="mt-1 text-text-primary">{report.osVersion}</dd>
                      </div>
                      <div>
                        <dt className="text-text-muted">GPU Backend</dt>
                        <dd className="mt-1 text-text-primary">
                          {getGpuLabel(report.gpuBackend)}
                        </dd>
                      </div>
                      <div className="md:col-span-2">
                        <dt className="text-text-muted">Build</dt>
                        <dd className="mt-1 text-text-primary">
                          {report.build ? formatReportBuildLabel(report.build) : "Unavailable"}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-text-secondary">
                      {report.notes}
                    </p>
                  </article>
                )})}
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-border bg-bg-primary p-6">
                <p className="text-[15px] leading-relaxed text-text-secondary">
                  No reports yet for the {getCompatibilityChannelLabel(channel).toLowerCase()} view.
                  Try switching to another channel or submit the first report for this build track.
                </p>
              </div>
            )}
          </section>

          {hasTags ? (
            <section className="rounded-xl border border-border bg-bg-surface p-8">
              <h2 className="text-xl font-semibold text-text-primary">Tags</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {game.tags.map((tag) => (
                  <Pill key={tag} variant="secondary">
                    {tag}
                  </Pill>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
