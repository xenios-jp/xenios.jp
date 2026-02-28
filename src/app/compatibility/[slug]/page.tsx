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

const DISCUSSION_REPO_OWNER = "xenios-jp";
const DISCUSSION_REPO_NAME = "xenios.jp";
const MAX_DISCUSSION_COMMENTS = 5;

interface GitHubIssueSearchItem {
  number: number;
  state: "open" | "closed";
  html_url: string;
  comments_url: string;
  body: string | null;
  updated_at: string;
}

interface GitHubIssueSearchResponse {
  items: GitHubIssueSearchItem[];
}

interface GitHubIssueCommentResponse {
  id: number;
  html_url: string;
  body: string;
  created_at: string;
  user: {
    login: string;
  };
}

interface GitHubDiscussionComment {
  id: number;
  url: string;
  author: string;
  createdAt: string;
  excerpt: string;
  images: string[];
}

interface GitHubDiscussionData {
  issueNumber: number;
  issueUrl: string;
  comments: GitHubDiscussionComment[];
  images: string[];
}

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

function extractImageUrls(markdown: string): string[] {
  const imageUrls = new Set<string>();
  const markdownImageRegex = /!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/g;
  const directImageRegex = /(https?:\/\/\S+\.(?:png|jpe?g|gif|webp))/gi;

  let match: RegExpExecArray | null;
  while ((match = markdownImageRegex.exec(markdown)) !== null) {
    imageUrls.add(match[1]);
  }
  while ((match = directImageRegex.exec(markdown)) !== null) {
    imageUrls.add(match[1]);
  }

  return [...imageUrls];
}

function normalizeExcerpt(markdown: string): string {
  const notesMatch = markdown.match(/###\s*Notes\s*([\s\S]*?)(?:\n---|$)/i);
  const source = notesMatch?.[1] ?? markdown;
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function formatIsoDate(dateString: string): string {
  const timestamp = new Date(dateString);
  if (Number.isNaN(timestamp.getTime())) return dateString;
  return timestamp.toISOString().slice(0, 10);
}

async function fetchGitHubDiscussion(titleId: string): Promise<GitHubDiscussionData | null> {
  const query = encodeURIComponent(
    `${titleId} repo:${DISCUSSION_REPO_OWNER}/${DISCUSSION_REPO_NAME} label:compat-report is:issue`
  );
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "xenios-website",
  };

  try {
    const searchRes = await fetch(
      `https://api.github.com/search/issues?q=${query}&per_page=5`,
      { headers, cache: "force-cache" }
    );
    if (!searchRes.ok) return null;

    const searchJson = (await searchRes.json()) as GitHubIssueSearchResponse;
    const canonicalIssue = searchJson.items
      .slice()
      .sort((a, b) => {
        if (a.state === "open" && b.state !== "open") return -1;
        if (b.state === "open" && a.state !== "open") return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })[0];

    if (!canonicalIssue) return null;

    const commentsRes = await fetch(canonicalIssue.comments_url, {
      headers,
      cache: "force-cache",
    });

    const rawComments = commentsRes.ok
      ? ((await commentsRes.json()) as GitHubIssueCommentResponse[])
      : [];

    const comments = rawComments
      .filter((comment) => comment.user.login !== "github-actions[bot]")
      .map((comment) => ({
        id: comment.id,
        url: comment.html_url,
        author: comment.user.login,
        createdAt: formatIsoDate(comment.created_at),
        excerpt: normalizeExcerpt(comment.body),
        images: extractImageUrls(comment.body),
      }))
      .filter((comment) => comment.excerpt.length > 0 || comment.images.length > 0)
      .reverse()
      .slice(0, MAX_DISCUSSION_COMMENTS);

    const allImages = [
      ...extractImageUrls(canonicalIssue.body ?? ""),
      ...comments.flatMap((comment) => comment.images),
    ];
    const uniqueImages = [...new Set(allImages)];

    return {
      issueNumber: canonicalIssue.number,
      issueUrl: canonicalIssue.html_url,
      comments,
      images: uniqueImages,
    };
  } catch {
    return null;
  }
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
  const discussion = await fetchGitHubDiscussion(game.titleId);

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

          {/* GitHub Discussion */}
          {discussion ? (
            <section className="rounded-xl border border-border bg-bg-surface p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-text-primary">
                  GitHub Discussion
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

              {discussion.comments.length > 0 ? (
                <div className="mt-4 flex flex-col gap-3">
                  {discussion.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-lg border border-border bg-bg-primary p-5"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-text-primary">
                          @{comment.author}
                        </span>
                        <span className="text-xs text-text-muted">{comment.createdAt}</span>
                      </div>
                      <p className="text-[15px] leading-relaxed text-text-secondary">
                        {comment.excerpt}
                      </p>
                      <a
                        href={comment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm text-accent transition hover:text-accent-hover"
                      >
                        Open comment
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-[15px] leading-relaxed text-text-muted">
                  No discussion comments yet.
                </p>
              )}

              {discussion.images.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                    Attached Images
                  </h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {discussion.images.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="overflow-hidden rounded-lg border border-border bg-bg-primary transition hover:border-accent/40"
                      >
                        <img
                          src={url}
                          alt={`GitHub attachment for ${game.title}`}
                          className="h-40 w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-[15px] leading-relaxed text-text-muted">
                  No image attachments in the GitHub thread yet.
                </p>
              )}
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
