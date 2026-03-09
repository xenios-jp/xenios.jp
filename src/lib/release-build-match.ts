export interface ComparableBuild {
  buildId?: string;
  channel?: string;
  official?: boolean;
  appVersion?: string;
  buildNumber?: string;
  stage?: string;
  commitShort?: string;
}

function normalize(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function same(left?: string | null, right?: string | null): boolean {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

export function matchesPublishedReleaseBuild(
  reportBuild: ComparableBuild | null | undefined,
  currentBuild: ComparableBuild | null | undefined,
): boolean {
  if (!reportBuild || !currentBuild) return false;
  if (reportBuild.channel === "preview") return false;

  const exactReleaseBuildIdMatch =
    reportBuild.channel === "release" && same(reportBuild.buildId, currentBuild.buildId);

  let strongIdentityMatches = exactReleaseBuildIdMatch ? 1 : 0;

  if (normalize(reportBuild.appVersion) && normalize(currentBuild.appVersion)) {
    if (!same(reportBuild.appVersion, currentBuild.appVersion)) return false;
    strongIdentityMatches += 1;
  }

  if (normalize(reportBuild.buildNumber) && normalize(currentBuild.buildNumber)) {
    if (!same(reportBuild.buildNumber, currentBuild.buildNumber)) return false;
    strongIdentityMatches += 1;
  }

  if (strongIdentityMatches === 0) return false;

  if (
    normalize(reportBuild.stage) &&
    normalize(currentBuild.stage) &&
    !same(reportBuild.stage, currentBuild.stage)
  ) {
    return false;
  }

  if (
    normalize(reportBuild.commitShort) &&
    normalize(currentBuild.commitShort) &&
    !same(reportBuild.commitShort, currentBuild.commitShort)
  ) {
    return false;
  }

  if (
    reportBuild.channel === "release" &&
    normalize(reportBuild.buildId) &&
    normalize(currentBuild.buildId) &&
    !same(reportBuild.buildId, currentBuild.buildId)
  ) {
    return false;
  }

  return true;
}
