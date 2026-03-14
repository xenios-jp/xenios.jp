import Link from "next/link";
import { Pill } from "@/components/pill";
import {
  deviceName,
  formatReportBuildLabel,
  getGpuLabel,
  getPerfLabel,
  getPlatformLabel,
  getStatusLabel,
  type Game,
} from "@/lib/compatibility";
import type {
  ActivityItem,
  GameDetailViewModel,
  ReleaseStatusCard,
} from "@/lib/game-detail";
import { COMPATIBILITY_TRACKER_REPORT_URL } from "@/lib/constants";

function formatDateLabel(value?: string | null): string {
  if (!value) return "Not yet verified";

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

function releaseCardHeadline(card: ReleaseStatusCard): string {
  if (!card.verified) {
    return card.buildLabel
      ? `${getPlatformLabel(card.platform)} release has no matched reports yet`
      : `${getPlatformLabel(card.platform)} release reports have no matched evidence yet`;
  }

  return `${getStatusLabel(card.status)} on the release track`;
}

function activityRoleLabel(item: ActivityItem): string {
  if (item.isCurrentReleaseEvidence) {
    return "Included in the current release verdict.";
  }
  if (item.track === "preview" || item.track === "self-built") {
    return "Context only. Preview, self-built, and non-matching local reports do not change the public release verdict.";
  }
  return "Historical release-track report retained for context.";
}

function observedRange(card: ReleaseStatusCard): string | null {
  if (!card.bestObserved || !card.worstObserved) {
    return null;
  }

  if (card.bestObserved.status === card.worstObserved.status) {
    return `Observed on ${deviceName(card.bestObserved.device)}.`;
  }

  return `Observed range: ${getStatusLabel(card.bestObserved.status)} on ${deviceName(
    card.bestObserved.device,
  )} down to ${getStatusLabel(card.worstObserved.status)} on ${deviceName(
    card.worstObserved.device,
  )}.`;
}

function getActivityImages(item: ActivityItem): string[] {
  if (item.kind === "discussion") {
    return item.entry.images;
  }
  return [...new Set([...(item.report.screenshots ?? []), ...(item.discussionEntry?.images ?? [])])];
}

function renderActivityImages(images: string[], title: string) {
  if (images.length === 0) return null;

  return (
    <div
      className={`mt-4 grid gap-3 ${
        images.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
      }`}
    >
      {images.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="overflow-hidden rounded-lg border border-border bg-bg-surface transition hover:border-accent/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Compatibility image for ${title}`}
            className="max-h-72 w-full rounded-lg object-contain"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}

function normalizeDiscussionPlatform(platform?: string): "ios" | "macos" | null {
  const normalized = platform?.trim().toLowerCase();
  if (normalized === "ios") return "ios";
  if (normalized === "macos") return "macos";
  return null;
}

function normalizeDiscussionStatus(
  status?: string,
): "playable" | "ingame" | "intro" | "loads" | "nothing" | null {
  if (
    status === "playable" ||
    status === "ingame" ||
    status === "intro" ||
    status === "loads" ||
    status === "nothing"
  ) {
    return status;
  }
  return null;
}

function normalizeDiscussionPerf(
  perf?: string,
): "great" | "ok" | "poor" | "n/a" | null {
  if (perf === "great" || perf === "ok" || perf === "poor" || perf === "n/a") {
    return perf;
  }
  return null;
}

function discussionMetaSummary(item: Extract<ActivityItem, { kind: "discussion" }>): string {
  const status = normalizeDiscussionStatus(item.entry.meta.status);
  const parts = [
    status ? getStatusLabel(status) : null,
    item.entry.meta.device ? deviceName(item.entry.meta.device) : null,
    item.entry.meta.osVersion ?? null,
    item.entry.meta.gpuBackend ?? null,
  ].filter((value): value is string => Boolean(value));

  return parts.join(" · ");
}

function ReleaseStatusSection({
  cards,
  latestActivityDate,
}: {
  cards: ReleaseStatusCard[];
  latestActivityDate: string | null;
}) {
  return (
    <section className="rounded-xl border border-border bg-bg-surface p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Current Release Status</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-text-muted">
            Public status stays conservative and only uses evidence that matches the current
            published release. Preview, self-built, and non-matching local activity appears
            below for context.
          </p>
        </div>
        <div className="text-sm text-text-muted">
          Latest activity: {formatDateLabel(latestActivityDate)}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <article
            key={card.platform}
            className="rounded-lg border border-border bg-bg-primary p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Pill variant={card.platform}>{getPlatformLabel(card.platform)}</Pill>
              <Pill variant={card.verified ? card.status : "untested"}>
                {card.verified ? getStatusLabel(card.status) : "Unverified"}
              </Pill>
              {card.variesByDevice ? <Pill variant="tag">Varies by device</Pill> : null}
            </div>

            <h3 className="mt-4 text-lg font-semibold text-text-primary">
              {releaseCardHeadline(card)}
            </h3>
            <p className="mt-1 text-sm text-text-muted">{card.basis}</p>

            <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <dt className="text-text-muted">Latest verified</dt>
                <dd className="mt-1 text-text-primary">
                  {formatDateLabel(card.latestReportDate)}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Evidence count</dt>
                <dd className="mt-1 text-text-primary">{card.reportCount}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-text-muted">Build basis</dt>
                <dd className="mt-1 text-text-primary">{card.buildLabel ?? card.basis}</dd>
              </div>
              {card.bestObserved ? (
                <div>
                  <dt className="text-text-muted">Best observed</dt>
                  <dd className="mt-1 text-text-primary">
                    {getStatusLabel(card.bestObserved.status)} on{" "}
                    {deviceName(card.bestObserved.device)}
                  </dd>
                </div>
              ) : null}
              {card.worstObserved ? (
                <div>
                  <dt className="text-text-muted">Lowest observed</dt>
                  <dd className="mt-1 text-text-primary">
                    {getStatusLabel(card.worstObserved.status)} on{" "}
                    {deviceName(card.worstObserved.device)}
                  </dd>
                </div>
              ) : null}
            </dl>

            <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">{card.note}</p>
            {observedRange(card) ? (
              <p className="mt-2 text-sm text-text-muted">{observedRange(card)}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function ActivityFeed({
  gameTitle,
  issueNumber,
  issueUrl,
  activity,
  hiddenReportCount,
}: {
  gameTitle: string;
  issueNumber?: number;
  issueUrl?: string;
  activity: ActivityItem[];
  hiddenReportCount: number;
}) {
  return (
    <section className="rounded-xl border border-border bg-bg-surface p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Recent Activity</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-text-muted">
            One unified report stream across release, preview, and self-built testing.
          </p>
          {hiddenReportCount > 0 ? (
            <p className="mt-2 text-sm text-text-muted">
              {hiddenReportCount} report{hiddenReportCount === 1 ? "" : "s"} hidden due to
              conflicting platform metadata.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {issueUrl ? (
            <a
              href={issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-accent transition hover:text-accent-hover"
            >
              {issueNumber ? `Open Issue #${issueNumber}` : "Open GitHub Thread"}
            </a>
          ) : null}
          <a
            href={COMPATIBILITY_TRACKER_REPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
          >
            Submit Report
          </a>
        </div>
      </div>

      {activity.length > 0 ? (
        <div className="mt-5 flex flex-col gap-4">
          {activity.map((item) => {
            if (item.kind === "discussion") {
              const discussionStatus = normalizeDiscussionStatus(item.entry.meta.status);
              const discussionPerf = normalizeDiscussionPerf(item.entry.meta.perf);
              const discussionPlatform = normalizeDiscussionPlatform(item.entry.meta.platform);

              return (
                <article
                  key={item.id}
                  className="rounded-lg border border-border bg-bg-primary p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {discussionStatus ? (
                        <Pill variant={discussionStatus}>
                          {getStatusLabel(discussionStatus)}
                        </Pill>
                      ) : null}
                      {discussionPerf ? (
                        <Pill variant={discussionPerf}>{getPerfLabel(discussionPerf)}</Pill>
                      ) : null}
                      {discussionPlatform ? (
                        <Pill variant={discussionPlatform}>
                          {getPlatformLabel(discussionPlatform)}
                        </Pill>
                      ) : null}
                      <Pill variant="tag">{item.trackLabel}</Pill>
                      <Pill variant="tag">{item.sourceLabel}</Pill>
                    </div>
                    <span className="text-sm text-text-muted">
                      {formatDateLabel(item.date)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-text-muted">
                    GitHub thread entry retained for context.
                  </p>

                  <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-text-secondary">
                    {item.entry.excerpt}
                  </p>

                  {discussionMetaSummary(item) ? (
                    <p className="mt-2 text-sm text-text-muted">
                      {discussionMetaSummary(item)}
                    </p>
                  ) : null}

                  {renderActivityImages(getActivityImages(item), gameTitle)}

                  <a
                    href={item.entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm text-accent transition hover:text-accent-hover"
                  >
                    {item.entry.type === "issue" ? "Open issue" : "Open comment"}
                  </a>
                </article>
              );
            }

            const reportPerf =
              item.report.perf ?? (item.report.status === "nothing" ? "n/a" : "ok");

            return (
              <article
                key={item.id}
                className="rounded-lg border border-border bg-bg-primary p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill variant={item.report.status}>{getStatusLabel(item.report.status)}</Pill>
                    <Pill variant={reportPerf}>{getPerfLabel(reportPerf)}</Pill>
                    <Pill variant={item.report.platform}>
                      {getPlatformLabel(item.report.platform)}
                    </Pill>
                    <Pill variant={item.track === "legacy" ? "tag" : item.track}>
                      {item.trackLabel}
                    </Pill>
                    <Pill variant="tag">{item.sourceLabel}</Pill>
                  </div>
                  <span className="text-sm text-text-muted">
                    {formatDateLabel(item.date)}
                  </span>
                </div>

                <p className="mt-3 text-sm text-text-muted">{activityRoleLabel(item)}</p>

                <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-text-muted">Device</dt>
                    <dd className="mt-1 text-text-primary">{deviceName(item.report.device)}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">OS Version</dt>
                    <dd className="mt-1 text-text-primary">{item.report.osVersion}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">GPU Backend</dt>
                    <dd className="mt-1 text-text-primary">
                      {getGpuLabel(item.report.gpuBackend)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Build</dt>
                    <dd className="mt-1 text-text-primary">
                      {item.buildLabel ?? formatReportBuildLabel(item.report.build) ?? "Unlabeled"}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-text-secondary">
                  {item.report.notes}
                </p>

                {renderActivityImages(getActivityImages(item), gameTitle)}

                {item.discussionEntry ? (
                  <a
                    href={item.discussionEntry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm text-accent transition hover:text-accent-hover"
                  >
                    {item.discussionEntry.type === "issue"
                      ? "Open mirrored issue"
                      : "Open mirrored comment"}
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-border bg-bg-primary p-6">
          <p className="text-[15px] leading-relaxed text-text-secondary">
            No reports have been submitted for this title yet.
          </p>
        </div>
      )}
    </section>
  );
}

export function GameDetailClient({
  game,
  detail,
}: {
  game: Game;
  detail: GameDetailViewModel;
}) {
  const hasTags = game.tags.length > 0;

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
              <div className="mt-1 font-mono text-[15px] leading-relaxed text-text-muted">
                <span className="mr-2 not-italic">Title IDs:</span>
                <span>{(game.titleIds.length > 0 ? game.titleIds : [game.titleId]).join(", ")}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {detail.latestActivityDate ? (
                <Pill variant="tag">
                  Latest activity {formatDateLabel(detail.latestActivityDate)}
                </Pill>
              ) : null}
              <Pill variant="tag">{detail.totalReportCount} total reports</Pill>
              {detail.hiddenReportCount > 0 ? (
                <Pill variant="tag">{detail.hiddenReportCount} filtered</Pill>
              ) : null}
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-text-muted">
            Public compatibility status tracks the latest official release only. Preview,
            self-built, and local builds that do not match that release stay in the activity feed
            so they do not overwrite the release verdict.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
        <div className="flex flex-col gap-8">
          <ReleaseStatusSection
            cards={detail.releaseCards}
            latestActivityDate={detail.latestActivityDate}
          />

          <ActivityFeed
            gameTitle={game.title}
            issueNumber={detail.issueNumber}
            issueUrl={detail.issueUrl}
            activity={detail.activity}
            hiddenReportCount={detail.hiddenReportCount}
          />

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
