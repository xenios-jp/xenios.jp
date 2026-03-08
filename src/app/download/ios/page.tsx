import type { Metadata } from "next";
import Link from "next/link";
import { IosReadFirst } from "@/components/ios-read-first";
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
  description:
    "Download XeniOS and start playing Xbox 360 games on your iPhone or iPad.",
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
  const versionLabel = resolvedBuild.appVersion ?? "Unavailable";
  const buildNumber = resolvedBuild.buildNumber ?? "Unavailable";
  const artifactCount = resolvedBuild.artifacts.length;

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
          <dd className="mt-1 font-mono text-text-primary">{versionLabel}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Build</dt>
          <dd className="mt-1 font-mono text-text-primary">{buildNumber}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Commit</dt>
          <dd className="mt-1 font-mono text-text-primary">
            {resolvedBuild.commitShort?.toUpperCase() ?? "Unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Artifacts</dt>
          <dd className="mt-1 font-mono text-text-primary">{artifactCount}</dd>
        </div>
      </dl>

      {artifactCount > 0 ? (
        <div className="mt-5 grid gap-3">
          {resolvedBuild.artifacts.map((artifact, index) => {
            const sizeLabel = formatFileSize(artifact.sizeBytes, artifact.sizeLabel);

            return (
              <div
                key={artifact.id ?? artifact.downloadUrl ?? `${title}-${index}`}
                className="rounded-lg border border-border bg-bg-primary p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary">
                      {getArtifactLabel(artifact)}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {sizeLabel ?? "Size unavailable"}
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
            );
          })}
        </div>
      ) : (
        <p className="mt-5 text-sm text-text-muted">
          No direct artifacts are listed for this build yet.
        </p>
      )}
    </div>
  );
}

export default function DownloadPage() {
  const latestRelease = getLatestBuild("ios", "release");
  const latestPreview = getLatestBuild("ios", "preview");
  const releaseMetadata =
    latestRelease && isRenderableBuild(latestRelease) ? latestRelease : null;
  const historyCount = getBuildsHistory("all").filter((build) => build.platform === "ios").length;
  const releaseArtifact = latestRelease?.artifacts[0];

  return (
    <>
      <section className="hero-gradient border-b border-border pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Download
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            XeniOS for iPhone and iPad.
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-bg-surface/40 py-4">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-border bg-bg-surface p-1">
              <Link
                href="/download/ios"
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg"
              >
                iPhone / iPad
              </Link>
              <Link
                href="/download/mac"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
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

      <section className="border-b border-border bg-amber-500/5 py-6">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-5">
            <h2 className="text-base font-semibold text-text-primary">
              Read first: required to run games
            </h2>
            <div className="mt-2">
              <IosReadFirst tone="primary" />
            </div>
            <p className="mt-3 text-[14px] text-text-secondary">
              Plain English: JIT is the permission the emulator needs to execute
              translated game code. Without it, games won&apos;t start.
              Need help? See{" "}
              <Link
                href="/docs/ios/getting-started"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                Getting Started
              </Link>{" "}
              and{" "}
              <Link
                href="/docs/ios/troubleshooting"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                Troubleshooting
              </Link>
              , or join{" "}
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                Discord
              </a>{" "}
              for setup help.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-bg-surface/20 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Latest iPhone / iPad Builds</h2>
              <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-text-secondary">
                Release is the public default. Preview builds stay separate so it is always clear
                which version a report or download refers to.
              </p>
            </div>
            <p className="text-sm text-text-muted">
              {historyCount > 0 ? `${historyCount} iOS builds tracked` : "No iOS build history published yet"}
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <BuildCard
              title="Latest Release"
              build={latestRelease}
              emptyMessage="Publish data/release-builds.json to surface the current public iPhone / iPad build."
            />
            <BuildCard
              title="Latest Preview"
              build={latestPreview}
              emptyMessage="No preview iPhone / iPad build has been published yet."
            />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-bg-surface/30 py-6">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Before you install
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Check the tested baseline first so you do not troubleshoot an
                unvalidated setup as if it were a supported one.
              </p>
            </div>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              Need setup help? Join Discord
            </a>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Lowest Tested OS
              </p>
              <p className="mt-2 text-lg font-semibold text-text-primary">
                iOS / iPadOS 18.0
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Older versions may work, but they are currently untested.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Lowest Tested Hardware
              </p>
              <p className="mt-2 text-lg font-semibold text-text-primary">
                A16-class silicon
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Older chips may work, but they are not currently validated.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Required To Run Games
              </p>
              <p className="mt-2 text-lg font-semibold text-text-primary">
                JIT setup
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Installing the app is not enough by itself. Games need
                StikDebug, and some setups also need LocalDevVPN.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-xl border border-accent/20 bg-bg-surface p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-accent-muted px-2.5 py-0.5 text-sm font-medium text-accent">
                Recommended
              </span>
            </div>
            <h2 className="text-3xl font-bold text-text-primary md:text-4xl">
              SideStore
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-secondary">
              SideStore is the current documented public install path for
              XeniOS on iPhone and iPad. On free Apple IDs, the app still needs
              to be refreshed every 7 days.
            </p>
            <ol className="mt-8 space-y-3 text-[15px] leading-relaxed text-text-primary">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-fg">
                  1
                </span>
                <span>
                  Install{" "}
                  <a
                    href="https://sidestore.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
                  >
                    SideStore
                  </a>{" "}
                  on your device.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-fg">
                  2
                </span>
                <span>
                  Download the{" "}
                  <code className="rounded bg-bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
                    .ipa
                  </code>{" "}
                  from the latest release card above
                  {releaseArtifact?.downloadUrl ? (
                    <>
                      {" "}
                      or{" "}
                      <a
                        href={releaseArtifact.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
                      >
                        open the current direct download
                      </a>
                    </>
                  ) : null}
                  , then open it with SideStore to install.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-fg">
                  3
                </span>
                <span>
                  Trust the developer certificate in Settings &rarr; General
                  &rarr; VPN &amp; Device Management.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-fg">
                  4
                </span>
                <span>
                  Complete JIT setup (see the &ldquo;Read first&rdquo; box
                  above), then launch a game.
                </span>
              </li>
            </ol>
            <div className="mt-10">
              <span className="inline-flex items-center rounded-lg bg-accent px-8 py-3.5 text-[15px] font-medium text-accent-fg opacity-70">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-12 md:pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-xl border border-border bg-bg-surface p-8">
            <h3 className="mb-4 text-lg font-bold text-text-primary">
              Build Metadata
            </h3>
            {releaseMetadata ? (
              <dl className="grid grid-cols-2 gap-4 text-[15px] font-mono md:grid-cols-4">
                <div>
                  <dt className="text-text-muted">Version</dt>
                  <dd className="mt-1 text-text-primary">
                    {releaseMetadata.appVersion ?? "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Build</dt>
                  <dd className="mt-1 text-text-primary">
                    {releaseMetadata.buildNumber ?? "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Commit</dt>
                  <dd className="mt-1 text-text-primary">
                    {releaseMetadata.commitShort?.toUpperCase() ?? "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Date</dt>
                  <dd className="mt-1 text-text-primary">
                    {formatPublishedDate(releaseMetadata.publishedAt)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-[15px] leading-relaxed text-text-secondary">
                No manifest-backed iPhone / iPad release metadata is published yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="pb-12 md:pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-xl border border-border bg-bg-surface p-8">
            <h2 className="text-2xl font-bold text-text-primary">Notes</h2>
            <ul className="mt-5 list-disc space-y-3 pl-6 text-[15px] leading-relaxed text-text-primary marker:text-accent">
              <li>
                Allow extra free space beyond the app itself for game files, caches, and updates.
              </li>
              <li>
                Older iOS versions and older chips may work, but they are currently untested and
                should not be treated as validated yet.
              </li>
              <li>
                No games are included. You must dump games from Xbox 360 discs or digital
                purchases that you legally own.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="pb-12 md:pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="border-t border-border pt-8">
            <p className="max-w-3xl text-sm text-text-muted">
              Xbox, Xbox 360, and related logos are trademarks of Microsoft
              Corporation. XeniOS is currently based on Xenia-Edge
              (has207/xenia-edge) in the Xenia codebase lineage. It is not
              affiliated with or endorsed by Microsoft. This project does not
              condone or support piracy. Users are responsible for ensuring
              they have the legal right to use any game files with this
              software.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
