"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getArtifactLabel, getBuildDisplayLabel } from "@/lib/build-display";

type BuildChannel = "release" | "preview";

interface BuildArtifact {
  id?: string;
  label?: string;
  arch?: string;
  kind?: string;
  platform?: "ios" | "macos";
  downloadUrl?: string;
  sha256?: string;
  sizeBytes?: number;
  sizeLabel?: string;
}

interface BuildHistoryEntry {
  id: string;
  platform: "ios" | "macos";
  channel?: BuildChannel;
  appVersion?: string;
  buildNumber?: string;
  commitShort?: string;
  publishedAt?: string;
  label?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  submittedBy?: string;
  artifacts: BuildArtifact[];
}

function getBuildChannelLabel(channel: BuildChannel): string {
  return channel === "release" ? "Release" : "Preview";
}

function formatPublishedDate(value?: string): string {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFileSize(sizeBytes?: number, sizeLabel?: string): string | null {
  if (sizeLabel) return sizeLabel;
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return null;
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = sizeBytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function parseChannel(value: string | null): BuildChannel {
  return value === "preview" ? "preview" : "release";
}

function buildTabHref(channel: BuildChannel): string {
  return channel === "release" ? "/builds" : `/builds?channel=${channel}`;
}

function BuildHistoryCard({ build }: { build: BuildHistoryEntry }) {
  return (
    <article className="rounded-xl border border-border bg-bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {build.platform === "ios" ? "iPhone / iPad" : "Mac"} •{" "}
            {getBuildChannelLabel(build.channel ?? "release")}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-text-primary">
            {getBuildDisplayLabel(build)}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Published {formatPublishedDate(build.publishedAt)}
          </p>
        </div>
        {build.sourceUrl ? (
          <a
            href={build.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            {build.sourceLabel ?? "Source"}
          </a>
        ) : null}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
        <div>
          <dt className="text-text-muted">Version</dt>
          <dd className="mt-1 font-mono text-text-primary">
            {build.appVersion ?? "Unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Build</dt>
          <dd className="mt-1 font-mono text-text-primary">
            {build.buildNumber ?? "Unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Commit</dt>
          <dd className="mt-1 font-mono text-text-primary">
            {build.commitShort?.toUpperCase() ?? "Unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Artifacts</dt>
          <dd className="mt-1 font-mono text-text-primary">{build.artifacts.length}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Submitted By</dt>
          <dd className="mt-1 text-text-primary">{build.submittedBy ?? "CI"}</dd>
        </div>
      </dl>

      {build.artifacts.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {build.artifacts.map((artifact, index) => (
            <div
              key={artifact.id ?? artifact.downloadUrl ?? `${build.id}-${index}`}
              className="rounded-lg border border-border bg-bg-primary p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-text-primary">{getArtifactLabel(artifact)}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {formatFileSize(artifact.sizeBytes, artifact.sizeLabel) ?? "Size unavailable"}
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-text-muted">
                    SHA-256: {artifact.sha256 ?? "Unavailable"}
                  </p>
                </div>
                {artifact.downloadUrl ? (
                  <a
                    href={artifact.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
                  >
                    Download
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-text-muted">
          This build has no direct artifacts listed yet.
        </p>
      )}
    </article>
  );
}

export function BuildsPageClient({ builds }: { builds: BuildHistoryEntry[] }) {
  const searchParams = useSearchParams();
  const channel = parseChannel(searchParams.get("channel"));
  const filteredBuilds = builds.filter((build) => build.channel === channel);

  return (
    <div className="min-h-screen bg-bg-primary">
      <section className="hero-gradient border-b border-border px-6 pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Builds
          </h1>
          <p className="mt-2 max-w-3xl text-lg text-text-secondary">
            Public XeniOS build history with version, build number, commit, checksums, and
            direct artifact links. macOS entries can publish separate Apple Silicon and Intel
            downloads.
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-bg-surface/30 px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-border bg-bg-surface p-1">
            {(["release", "preview"] as const).map((entry) => {
              const active = entry === channel;
              return (
                <Link
                  key={entry}
                  href={buildTabHref(entry)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-accent text-accent-fg"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {getBuildChannelLabel(entry)}
                </Link>
              );
            })}
          </div>

          <p className="text-sm text-text-muted">
            {filteredBuilds.length} {filteredBuilds.length === 1 ? "build" : "builds"} in this view
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {filteredBuilds.length > 0 ? (
          <div className="flex flex-col gap-6">
            {filteredBuilds.map((build) => (
              <BuildHistoryCard key={build.id} build={build} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-bg-surface p-8">
            <h2 className="text-2xl font-semibold text-text-primary">
              No {getBuildChannelLabel(channel).toLowerCase()} builds published yet
            </h2>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-text-secondary">
              This page reads from <code className="rounded bg-bg-surface-2 px-1.5 py-0.5 font-mono text-xs">data/builds-history.json</code>.
              Once that manifest is populated, versioned release and preview history will show up
              here automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
