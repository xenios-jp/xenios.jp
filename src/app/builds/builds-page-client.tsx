import { getArtifactLabel, getBuildDisplayLabel } from "@/lib/build-display";

type BuildChannel = "release";
type BuildPlatform = "ios" | "macos";

const PLATFORM_ORDER: BuildPlatform[] = ["ios", "macos"];

interface BuildArtifact {
  id?: string;
  label?: string;
  arch?: string;
  kind?: string;
  platform?: BuildPlatform;
  downloadUrl?: string;
  sha256?: string;
  sizeBytes?: number;
  sizeLabel?: string;
}

interface BuildHistoryEntry {
  id: string;
  platform: BuildPlatform;
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

interface BuildHistoryGroup {
  id: string;
  channel: BuildChannel;
  appVersion?: string;
  buildNumber?: string;
  commitShort?: string;
  publishedAt?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  submittedBy?: string;
  entries: Partial<Record<BuildPlatform, BuildHistoryEntry>>;
}

function getBuildChannelLabel(channel: BuildChannel): string {
  return channel === "release" ? "Release" : channel;
}

function getPlatformLabel(platform: BuildPlatform): string {
  return platform === "ios" ? "iPhone / iPad" : "Mac";
}

function formatPublishedDate(value?: string): string {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
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

function getBuildGroupKey(build: BuildHistoryEntry): string {
  return [
    build.channel ?? "release",
    build.sourceUrl ?? "",
    build.appVersion ?? "",
    build.buildNumber ?? "",
    build.commitShort ?? "",
    build.publishedAt ?? "",
    build.label ?? "",
  ].join("::");
}

function groupBuilds(builds: BuildHistoryEntry[]): BuildHistoryGroup[] {
  const groups = new Map<string, BuildHistoryGroup>();

  for (const build of builds) {
    const key = getBuildGroupKey(build);
    const existing = groups.get(key);

    if (existing) {
      existing.entries[build.platform] = build;
      if (!existing.sourceLabel && build.sourceLabel) existing.sourceLabel = build.sourceLabel;
      if (!existing.sourceUrl && build.sourceUrl) existing.sourceUrl = build.sourceUrl;
      if (!existing.submittedBy && build.submittedBy) existing.submittedBy = build.submittedBy;
      continue;
    }

    groups.set(key, {
      id: key,
      channel: build.channel ?? "release",
      appVersion: build.appVersion,
      buildNumber: build.buildNumber,
      commitShort: build.commitShort,
      publishedAt: build.publishedAt,
      sourceLabel: build.sourceLabel,
      sourceUrl: build.sourceUrl,
      submittedBy: build.submittedBy,
      entries: {
        [build.platform]: build,
      },
    });
  }

  return [...groups.values()];
}

function countArtifacts(group: BuildHistoryGroup): number {
  return PLATFORM_ORDER.reduce((count, platform) => {
    return count + (group.entries[platform]?.artifacts.length ?? 0);
  }, 0);
}

function getPlatformsSummary(group: BuildHistoryGroup): string {
  const labels = PLATFORM_ORDER.filter((platform) => Boolean(group.entries[platform])).map(
    (platform) => getPlatformLabel(platform),
  );

  if (labels.length === 0) return "Unavailable";
  if (labels.length === 1) return labels[0] ?? "Unavailable";
  return labels.join(" + ");
}

function BuildArtifactRow({ artifact }: { artifact: BuildArtifact }) {
  return (
    <div className="rounded-lg border border-border bg-bg-primary p-4">
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
  );
}

function BuildPlatformPanel({
  platform,
  build,
}: {
  platform: BuildPlatform;
  build?: BuildHistoryEntry;
}) {
  const artifacts = build?.artifacts ?? [];
  const artifactCount = artifacts.length;

  return (
    <section className="rounded-xl border border-border bg-bg-primary/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {getPlatformLabel(platform)}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {build
              ? `${artifactCount} artifact${artifactCount === 1 ? "" : "s"} published for this platform.`
              : "No artifact published for this platform in this build."}
          </p>
        </div>
        <span className="rounded-full border border-border bg-bg-surface px-3 py-1 text-xs font-medium text-text-muted">
          {build
            ? `${artifactCount} artifact${artifactCount === 1 ? "" : "s"}`
            : "Unavailable"}
        </span>
      </div>

      {artifactCount > 0 ? (
        <div className={`mt-5 grid gap-3 ${artifactCount > 1 ? "xl:grid-cols-2" : ""}`}>
          {artifacts.map((artifact, index) => (
            <BuildArtifactRow
              key={artifact.id ?? artifact.downloadUrl ?? `${build?.id ?? platform}-${index}`}
              artifact={artifact}
            />
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-text-muted">
          This platform does not have a direct download listed for this build.
        </p>
      )}
    </section>
  );
}

function BuildHistoryCard({ group }: { group: BuildHistoryGroup }) {
  const displayBuild = group.entries.ios ?? group.entries.macos;
  if (!displayBuild) return null;

  return (
    <article className="rounded-xl border border-border bg-bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {getBuildChannelLabel(group.channel)} build
          </p>
          <h3 className="mt-2 text-2xl font-bold text-text-primary">
            {getBuildDisplayLabel(displayBuild)}
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Published {formatPublishedDate(group.publishedAt)}
          </p>
        </div>
        {group.sourceUrl ? (
          <a
            href={group.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            {group.sourceLabel ?? "Source"}
          </a>
        ) : null}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm xl:grid-cols-6">
        <div>
          <dt className="text-text-muted">Version</dt>
          <dd className="mt-1 font-mono text-text-primary">
            {group.appVersion ?? "Unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Build</dt>
          <dd className="mt-1 font-mono text-text-primary">
            {group.buildNumber ?? "Unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Commit</dt>
          <dd className="mt-1 font-mono text-text-primary">
            {group.commitShort?.toUpperCase() ?? "Unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Platforms</dt>
          <dd className="mt-1 text-text-primary">{getPlatformsSummary(group)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Artifacts</dt>
          <dd className="mt-1 font-mono text-text-primary">{countArtifacts(group)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Submitted By</dt>
          <dd className="mt-1 text-text-primary">{group.submittedBy ?? "CI"}</dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {PLATFORM_ORDER.map((platform) => (
          <BuildPlatformPanel
            key={`${group.id}-${platform}`}
            platform={platform}
            build={group.entries[platform]}
          />
        ))}
      </div>
    </article>
  );
}

function BuildHistorySection({
  builds,
}: {
  builds: BuildHistoryEntry[];
}) {
  const groupedBuilds = groupBuilds(builds);
  const id = "release";
  const title = "Release builds";
  const description = "Public, supported builds with direct download links and checksums.";

  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary">{title}</h2>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-text-secondary">
            {description}
          </p>
        </div>
        <p className="text-sm text-text-muted">
          {groupedBuilds.length} {groupedBuilds.length === 1 ? "build" : "builds"}
        </p>
      </div>

      <div className="mt-6">
        {groupedBuilds.length > 0 ? (
          <div className="flex flex-col gap-6">
            {groupedBuilds.map((group) => (
              <BuildHistoryCard key={group.id} group={group} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-bg-surface p-8">
            <h3 className="text-2xl font-semibold text-text-primary">
              No release builds published yet
            </h3>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-text-secondary">
              This page reads from{" "}
              <code className="rounded bg-bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
                data/builds-history.json
              </code>
              . Once that manifest is populated, versioned build history will appear here
              automatically.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function BuildsPageClient({ builds }: { builds: BuildHistoryEntry[] }) {
  const releaseBuilds = builds.filter((build) => build.channel === "release");
  const totalBuilds = groupBuilds(releaseBuilds).length;

  return (
    <div className="min-h-screen bg-bg-primary">
      <section className="hero-gradient border-b border-border px-6 pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Builds
          </h1>
          <p className="mt-2 max-w-3xl text-lg text-text-secondary">
            Public XeniOS release history with version, build number, commit, checksums, and
            direct artifact links. Each build groups iPhone / iPad and Mac downloads together,
            while Mac still keeps Apple Silicon and Intel artifacts separate.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-6 py-10">
        <p className="text-sm text-text-muted">
          {totalBuilds} total {totalBuilds === 1 ? "build" : "builds"} tracked
        </p>
        <BuildHistorySection builds={releaseBuilds} />
      </div>
    </div>
  );
}
