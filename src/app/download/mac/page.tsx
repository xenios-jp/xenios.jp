import type { Metadata } from "next";
import Link from "next/link";
import {
  formatFileSize,
  formatPublishedDate,
  getArtifactLabel,
  getBuildDisplayLabel,
  getBuildsHistory,
  getLatestBuild,
  isRenderableBuild,
  type PublicBuildArtifact,
  type PublicBuildEntry,
} from "@/lib/builds";
import { getArchitectureDisplayLabel } from "@/lib/build-display";
import { DISCORD_URL } from "@/lib/constants";
import { withCanonical } from "@/lib/metadata";

export const metadata: Metadata = withCanonical(
  {
    title: "Download for Mac",
    description: "Download XeniOS for Mac.",
  },
  "/download/mac"
);

function macArtifactSortValue(artifact: PublicBuildArtifact): number {
  switch (artifact.arch) {
    case "arm64":
      return 0;
    case "x86_64":
      return 1;
    case "universal":
      return 2;
    default:
      return 3;
  }
}

function sortMacArtifacts(artifacts: PublicBuildArtifact[]): PublicBuildArtifact[] {
  return [...artifacts].sort((left, right) => {
    const orderDelta = macArtifactSortValue(left) - macArtifactSortValue(right);
    if (orderDelta !== 0) return orderDelta;
    return (left.label ?? left.name ?? "").localeCompare(right.label ?? right.name ?? "");
  });
}

function getMacArchitectureLabel(artifact: PublicBuildArtifact): string {
  return getArchitectureDisplayLabel("macos", artifact.arch) ?? "Mac";
}

function getMacArtifactDescription(artifact: PublicBuildArtifact): string {
  switch (artifact.arch) {
    case "arm64":
      return "Use this on M-series Macs, including M1, M2, M3, and newer.";
    case "x86_64":
      return "Use this on Intel-based Macs.";
    case "universal":
      return "Single app bundle containing both Apple Silicon and Intel binaries.";
    default:
      return "Choose the build that matches your Mac hardware.";
  }
}

function getMacDownloadLabel(artifact: PublicBuildArtifact): string {
  return `Download for ${getMacArchitectureLabel(artifact)}`;
}

function BuildCard({
  title,
  build,
  emptyMessage,
}: {
  title: string;
  build: PublicBuildEntry | null;
  emptyMessage: string;
}) {
  if (!build || !isRenderableBuild(build)) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-bg-surface p-6">
        <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const resolvedBuild = build;
  const artifacts = sortMacArtifacts(resolvedBuild.artifacts);

  return (
    <div className="rounded-xl border border-border bg-bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-text-primary">
            {getBuildDisplayLabel(resolvedBuild)}
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Published {formatPublishedDate(resolvedBuild.publishedAt)}
          </p>
        </div>
        <Link
          href="/builds"
          className="text-sm text-accent underline underline-offset-2 hover:text-accent-hover"
        >
          Build history
        </Link>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div>
          <dt className="text-text-muted">Version</dt>
          <dd className="mt-1 font-mono text-text-primary">
            {resolvedBuild.appVersion ?? "Unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Build</dt>
          <dd className="mt-1 font-mono text-text-primary">
            {resolvedBuild.buildNumber ?? "Unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Commit</dt>
          <dd className="mt-1 font-mono text-text-primary">
            {resolvedBuild.commitShort?.toUpperCase() ?? "Unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Artifacts</dt>
          <dd className="mt-1 font-mono text-text-primary">{resolvedBuild.artifacts.length}</dd>
        </div>
      </dl>

      {artifacts.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {artifacts.map((artifact, index) => (
            <div
              key={artifact.id ?? artifact.downloadUrl ?? `${title}-${index}`}
              className="rounded-lg border border-border bg-bg-primary p-4"
            >
              <div className="flex h-full flex-col justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {getMacArchitectureLabel(artifact)}
                  </p>
                  <p className="mt-2 font-medium text-text-primary">
                    {artifact.name ?? getArtifactLabel(artifact)}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {getMacArtifactDescription(artifact)}
                  </p>
                  <p className="mt-3 text-sm text-text-muted">
                    {formatFileSize(artifact.sizeBytes, artifact.sizeLabel) ?? "Size unavailable"}
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-text-muted">
                    SHA-256: {artifact.sha256 ?? "Unavailable"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {artifact.downloadUrl ? (
                    <a
                      href={artifact.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
                    >
                      {getMacDownloadLabel(artifact)}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-text-muted">
          No direct artifacts are listed for this build yet.
        </p>
      )}
    </div>
  );
}

export default function DownloadMacPage() {
  const latestRelease = getLatestBuild("macos", "release");
  const latestPreview = getLatestBuild("macos", "preview");
  const historyCount = getBuildsHistory("all").filter((build) => build.platform === "macos").length;
  const releaseArtifacts = latestRelease ? sortMacArtifacts(latestRelease.artifacts) : [];

  return (
    <>
      <section className="hero-gradient border-b border-border pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Download
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            XeniOS for Mac. Choose Apple Silicon for M-series Macs or Intel for older Macs.
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-bg-surface/40 py-4">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-border bg-bg-surface p-1">
              <Link
                href="/download/ios"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                iPhone / iPad
              </Link>
              <Link
                href="/download/mac"
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg"
              >
                Mac
              </Link>
            </div>
            <p className="text-sm text-text-secondary">
              One codebase, two Mac downloads: Apple Silicon and Intel.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-amber-500/5 py-6">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-5">
            <h2 className="text-base font-semibold text-text-primary">Read first</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-text-primary">
              XeniOS for Mac currently requires{" "}
              <strong>macOS 15.0 or newer</strong>. Not every game runs yet,
              and performance and stability are still game-dependent.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-text-primary">
              XeniOS is still alpha software. Expect crashes, rough edges, and
              incomplete compatibility. Do not expect a polished or fully
              stable experience yet.
            </p>
            <p className="mt-3 text-[14px] text-text-secondary">
              Download the build that matches your hardware, then treat current
              compatibility as early and verify on your own Mac before assuming
              a title will run well.
              Need help with first launch or Gatekeeper? Join{" "}
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                Discord
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-bg-surface/20 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Latest Mac Builds</h2>
              <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-text-secondary">
                Release stays separate from Preview, and each build can publish dedicated Apple
                Silicon and Intel downloads so users always know which artifact matches their Mac.
              </p>
            </div>
            <p className="text-sm text-text-muted">
              {historyCount > 0 ? `${historyCount} macOS builds tracked` : "No macOS build history published yet"}
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <BuildCard
              title="Latest Release"
              build={latestRelease}
              emptyMessage="Publish data/release-builds.json to surface the current public Mac release with Apple Silicon and Intel downloads."
            />
            <BuildCard
              title="Latest Preview"
              build={latestPreview}
              emptyMessage="No preview Mac build has been published yet."
            />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-bg-surface/20 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-xl border border-border bg-bg-surface p-6">
            <h2 className="text-xl font-semibold text-text-primary">
              Mac install steps
            </h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-text-primary">
              <li>Open the latest release card above or the build history page.</li>
              <li>Choose the Apple Silicon download for M-series Macs or the Intel download for older Macs.</li>
              <li>
                If a{" "}
                <code className="rounded bg-bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
                  .dmg
                </code>{" "}
                is provided, open it and drag the app to Applications.
              </li>
              <li>
                If Gatekeeper blocks first launch, try opening the app once,
                then go to <strong>System Settings &rarr; Privacy &amp; Security</strong>{" "}
                and use <strong>Open Anyway</strong>.
              </li>
              <li>Add your legally dumped game files and launch.</li>
            </ol>
            <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
              Need help with Gatekeeper or first launch? Use{" "}
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                Discord
              </a>
              .
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/builds"
                className="inline-flex items-center rounded-lg border border-border px-6 py-3 text-[15px] font-medium text-text-primary transition-colors hover:bg-bg-surface-2"
              >
                Open Build History
              </Link>
              {releaseArtifacts.map((artifact) =>
                artifact.downloadUrl ? (
                  <a
                    key={artifact.id ?? artifact.downloadUrl}
                    href={artifact.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg bg-accent px-6 py-3.5 text-[15px] font-medium text-accent-fg transition-colors hover:bg-accent-hover"
                  >
                    {getMacDownloadLabel(artifact)}
                  </a>
                ) : null,
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-6 text-3xl font-bold text-text-primary md:text-4xl">
            Mac notes
          </h2>
          <ul className="list-disc space-y-3 pl-6 text-[15px] leading-relaxed text-text-primary marker:text-accent">
            <li>Apple Silicon (M-series) and Intel Macs are published as separate downloads.</li>
            <li>
              Performance and compatibility are still in progress and not fully validated yet.
            </li>
            <li>No games are included. Use only game dumps you legally own.</li>
          </ul>
        </div>
      </section>

      <section className="pb-12 md:pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-xl border border-border bg-bg-surface p-8">
            <h3 className="mb-4 text-lg font-bold text-text-primary">
              Build Metadata
            </h3>
            {isRenderableBuild(latestRelease) ? (
              <dl className="grid grid-cols-2 gap-4 text-[15px] font-mono md:grid-cols-4">
                <div>
                  <dt className="text-text-muted">Version</dt>
                  <dd className="mt-1 text-text-primary">
                    {latestRelease.appVersion ?? "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Build</dt>
                  <dd className="mt-1 text-text-primary">
                    {latestRelease.buildNumber ?? "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Commit</dt>
                  <dd className="mt-1 text-text-primary">
                    {latestRelease.commitShort?.toUpperCase() ?? "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Date</dt>
                  <dd className="mt-1 text-text-primary">
                    {formatPublishedDate(latestRelease.publishedAt)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-[15px] leading-relaxed text-text-secondary">
                No manifest-backed Mac release metadata is published yet.
              </p>
            )}
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              When available, the release manifest should publish separate macOS artifacts labeled
              <strong> Apple Silicon</strong> and <strong> Intel</strong>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
