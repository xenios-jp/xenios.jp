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
  type PublicBuildEntry,
} from "@/lib/builds";
import { DISCORD_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Download",
  description: "Download XeniOS for Mac.",
};

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

      {resolvedBuild.artifacts.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {resolvedBuild.artifacts.map((artifact, index) => (
            <div
              key={artifact.id ?? artifact.downloadUrl ?? `${title}-${index}`}
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
  const primaryArtifact = latestRelease?.artifacts[0];

  return (
    <>
      <section className="hero-gradient border-b border-border pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Download
          </h1>
          <p className="mt-2 text-lg text-text-secondary">XeniOS for Mac.</p>
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
              One codebase, two builds: iPhone/iPad and Mac.
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
                Release stays separate from Preview so compatibility and download guidance can
                point at the exact public build users should be testing.
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
              emptyMessage="Publish data/release-builds.json to surface the current public Mac build."
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
              <li>Download the latest macOS build asset.</li>
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
              {primaryArtifact?.downloadUrl ? (
                <a
                  href={primaryArtifact.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg bg-accent px-8 py-3.5 text-[15px] font-medium text-accent-fg transition-colors hover:bg-accent-hover"
                >
                  Download Latest Release
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-6 text-3xl font-bold text-text-primary md:text-4xl">
            Mac notes
          </h2>
          <ul className="space-y-3 text-[15px] leading-relaxed text-text-primary">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>Intel and Apple Silicon (M-series) Macs are supported.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>
                Performance and compatibility are still in progress and not
                fully validated yet.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>No games are included. Use only game dumps you legally own.</span>
            </li>
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
          </div>
        </div>
      </section>
    </>
  );
}
