export type DisplayBuildPlatform = "ios" | "macos";
export type DisplayBuildArchitecture = "arm64" | "x86_64" | "universal";
export type DisplayBuildChannel = "release" | "preview" | "self-built";
export type DisplayBuildStage = "alpha" | "beta" | "rc" | "stable";

export interface DisplayBuildLike {
  label?: string;
  appVersion?: string;
  buildNumber?: string;
  buildId?: string;
  channel?: string;
  stage?: string;
}

export interface DisplayArtifactLike {
  label?: string;
  name?: string;
  arch?: string;
  kind?: string;
  platform?: string;
}

export function normalizeBuildArchitecture(
  value: unknown,
): DisplayBuildArchitecture | undefined {
  if (value === "arm64") return "arm64";
  if (value === "x86_64" || value === "x64" || value === "amd64") return "x86_64";
  if (value === "universal") return "universal";
  return undefined;
}

export function normalizeBuildChannel(
  value: unknown,
): DisplayBuildChannel | undefined {
  if (value === "release" || value === "preview" || value === "self-built") {
    return value;
  }
  return undefined;
}

export function normalizeBuildStage(
  value: unknown,
): DisplayBuildStage | undefined {
  if (value === "alpha" || value === "beta" || value === "rc" || value === "stable") {
    return value;
  }
  return undefined;
}

export function getBuildStageDisplayLabel(stage?: string): string | null {
  switch (normalizeBuildStage(stage)) {
    case "alpha":
      return "Alpha";
    case "beta":
      return "Beta";
    case "rc":
      return "RC";
    default:
      return null;
  }
}

export function getArchitectureDisplayLabel(
  platform?: string,
  arch?: string,
): string | null {
  const normalizedArch = normalizeBuildArchitecture(arch);
  if (!normalizedArch) return null;

  if (platform === "macos") {
    if (normalizedArch === "arm64") return "Apple Silicon";
    if (normalizedArch === "x86_64") return "Intel";
    return "Universal";
  }

  if (normalizedArch === "x86_64") return "x64";
  if (normalizedArch === "arm64") return "arm64";
  return "Universal";
}

export function getBuildDisplayLabel(build: DisplayBuildLike): string {
  if (build.label) return build.label;

  const versionLabel = build.appVersion
    ? build.buildNumber
      ? `${build.appVersion} (${build.buildNumber})`
      : build.appVersion
    : null;
  const stageLabel = getBuildStageDisplayLabel(build.stage);
  const channel = normalizeBuildChannel(build.channel);

  if (versionLabel) {
    if (channel === "preview") {
      return stageLabel ? `${stageLabel} Preview ${versionLabel}` : `Preview ${versionLabel}`;
    }
    if (stageLabel) {
      return `${stageLabel} ${versionLabel}`;
    }
    return versionLabel;
  }

  if (build.buildId) return build.buildId;
  return "Unlabeled build";
}

export function getArtifactLabel(artifact: DisplayArtifactLike): string {
  if (artifact.label) return artifact.label;

  const platformLabel =
    artifact.platform === "ios"
      ? "iOS"
      : artifact.platform === "macos"
        ? "macOS"
        : null;
  const architectureLabel = getArchitectureDisplayLabel(artifact.platform, artifact.arch);

  const parts = [platformLabel, architectureLabel, artifact.kind ?? null].filter(
    (entry): entry is string => Boolean(entry),
  );

  if (parts.length > 0) return parts.join(" · ");
  if (artifact.name) return artifact.name;
  return "Artifact";
}
