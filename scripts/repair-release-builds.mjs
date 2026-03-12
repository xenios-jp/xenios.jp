import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const RELEASE_MANIFEST_PATH = "data/release-builds.json";
const BUILD_HISTORY_PATH = "data/builds-history.json";
const GITHUB_API_BASE = process.env.GITHUB_API_BASE || "https://api.github.com";
const USER_AGENT = "xenios-website-release-build-repair";

const releaseCache = new Map();

async function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function writeJson(relativePath, value) {
  const filePath = path.join(repoRoot, relativePath);
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
}

function cleanString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizePlatform(value) {
  return value === "ios" || value === "macos" ? value : null;
}

function inferPlatformFromBuildId(buildId) {
  if (!buildId) return null;
  if (buildId.startsWith("ios-")) return "ios";
  if (buildId.startsWith("macos-")) return "macos";
  return null;
}

function inferPlatformFromAssetName(assetName) {
  const normalized = assetName.toLowerCase();
  if (normalized.endsWith(".ipa") || normalized.includes("_ios_")) {
    return "ios";
  }
  if (normalized.endsWith(".dmg") || normalized.includes("_macos_")) {
    return "macos";
  }
  return null;
}

function inferArchitectureFromAssetName(assetName, platform) {
  const normalized = assetName.toLowerCase();

  if (platform === "ios") {
    return "arm64";
  }
  if (normalized.includes("apple_silicon") || normalized.includes("arm64")) {
    return "arm64";
  }
  if (normalized.includes("intel") || normalized.includes("x86_64") || normalized.includes("x64")) {
    return "x86_64";
  }
  if (normalized.includes("universal")) {
    return "universal";
  }
  return null;
}

function inferKindFromAssetName(assetName) {
  const extensionMatch = assetName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return extensionMatch?.[1] ?? null;
}

function normalizeSha256(value) {
  const digest = cleanString(value);
  if (!digest) return undefined;
  return digest.startsWith("sha256:") ? digest.slice("sha256:".length) : digest;
}

function slugifyToken(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function formatSizeLabel(sizeBytes) {
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return undefined;
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

function getArtifactPresentation(platform, arch, kind, assetName) {
  if (platform === "ios") {
    return {
      name: "XeniOS for iPhone / iPad",
      label: kind === "ipa" ? "iPhone / iPad (IPA)" : "iPhone / iPad",
    };
  }

  if (platform === "macos" && arch === "arm64") {
    return {
      name: "XeniOS for Apple Silicon",
      label: "Apple Silicon",
    };
  }

  if (platform === "macos" && arch === "x86_64") {
    return {
      name: "XeniOS for Intel",
      label: "Intel",
    };
  }

  if (platform === "macos" && arch === "universal") {
    return {
      name: "XeniOS for Mac",
      label: "Universal",
    };
  }

  return {
    name: assetName,
    label: undefined,
  };
}

function parseGitHubReleaseSource(sourceUrl) {
  const cleaned = cleanString(sourceUrl);
  if (!cleaned) return null;

  const match = cleaned.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/tag\/([^/?#]+)$/,
  );
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2],
    tag: decodeURIComponent(match[3]),
  };
}

async function fetchJson(url) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
  };

  const token = cleanString(process.env.GITHUB_TOKEN);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function fetchReleaseByTag(source) {
  const cacheKey = `${source.owner}/${source.repo}/${source.tag}`;
  if (!releaseCache.has(cacheKey)) {
    releaseCache.set(
      cacheKey,
      fetchJson(
        `${GITHUB_API_BASE}/repos/${source.owner}/${source.repo}/releases/tags/${encodeURIComponent(
          source.tag,
        )}`,
      ),
    );
  }

  return releaseCache.get(cacheKey);
}

function mapReleaseAssetsToPlatform(releasePayload, platform) {
  const assets = Array.isArray(releasePayload?.assets) ? releasePayload.assets : [];

  return assets.flatMap((asset) => {
    const assetRecord = asRecord(asset);
    if (!assetRecord) return [];

    const assetName = cleanString(assetRecord.name);
    if (!assetName) return [];

    const assetPlatform = inferPlatformFromAssetName(assetName);
    if (assetPlatform !== platform) return [];

    const arch = inferArchitectureFromAssetName(assetName, platform);
    const kind = inferKindFromAssetName(assetName);
    const sizeBytes = cleanNumber(assetRecord.size) ?? undefined;
    const presentation = getArtifactPresentation(platform, arch, kind, assetName);

    return [
      {
        id: `${platform}-${arch ?? "unknown"}-${kind ?? "artifact"}-${slugifyToken(assetName)}`,
        name: presentation.name,
        label: presentation.label,
        platform,
        arch: arch ?? undefined,
        kind: kind ?? undefined,
        downloadUrl: cleanString(assetRecord.browser_download_url) ?? undefined,
        sha256: normalizeSha256(assetRecord.digest),
        sizeBytes,
        sizeLabel: formatSizeLabel(sizeBytes),
      },
    ];
  });
}

async function repairBuildEntry(entry, fallbackPlatform) {
  const record = asRecord(entry);
  if (!record) {
    return { entry, changed: false };
  }

  const currentArtifacts = Array.isArray(record.artifacts) ? record.artifacts : [];
  if (currentArtifacts.length > 0) {
    return { entry, changed: false };
  }

  const platform =
    normalizePlatform(record.platform) ??
    fallbackPlatform ??
    inferPlatformFromBuildId(cleanString(record.buildId));
  const source = parseGitHubReleaseSource(record.sourceUrl);

  if (!platform || !source) {
    return { entry, changed: false };
  }

  const releasePayload = await fetchReleaseByTag(source);
  const repairedArtifacts = mapReleaseAssetsToPlatform(releasePayload, platform);
  if (repairedArtifacts.length === 0) {
    throw new Error(
      `Release ${source.owner}/${source.repo}@${source.tag} has no ${platform} artifacts to publish`,
    );
  }

  return {
    changed: true,
    entry: {
      ...record,
      platform,
      publishedAt: cleanString(record.publishedAt) ?? cleanString(releasePayload.published_at) ?? undefined,
      artifacts: repairedArtifacts,
    },
  };
}

async function main() {
  const [releaseManifest, buildHistory] = await Promise.all([
    readJson(RELEASE_MANIFEST_PATH),
    readJson(BUILD_HISTORY_PATH),
  ]);

  let repairedEntries = 0;

  for (const platform of ["ios", "macos"]) {
    const platformRecord = asRecord(releaseManifest?.platforms?.[platform]);
    if (!platformRecord) continue;

    for (const channel of ["release", "preview"]) {
      const currentEntry = platformRecord[channel];
      const repaired = await repairBuildEntry(currentEntry, platform);
      platformRecord[channel] = repaired.entry;
      if (repaired.changed) {
        repairedEntries += 1;
      }
    }
  }

  const builds = Array.isArray(buildHistory?.builds) ? buildHistory.builds : [];
  for (let index = 0; index < builds.length; index += 1) {
    const buildEntry = builds[index];
    const repaired = await repairBuildEntry(buildEntry, null);
    builds[index] = repaired.entry;
    if (repaired.changed) {
      repairedEntries += 1;
    }
  }

  if (repairedEntries === 0) {
    console.log("Release build artifacts already up to date");
    return;
  }

  const generatedAt = new Date().toISOString();
  releaseManifest.generatedAt = generatedAt;
  buildHistory.generatedAt = generatedAt;

  await Promise.all([
    writeJson(RELEASE_MANIFEST_PATH, releaseManifest),
    writeJson(BUILD_HISTORY_PATH, buildHistory),
  ]);

  console.log(`Repaired GitHub release artifacts for ${repairedEntries} build entries`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
