// Writes public/sidestore.json, an AltStore / SideStore source for XeniOS, from the
// official iOS release builds in data/builds-history.json.
//
// Format: https://faq.altstore.io/developers/make-a-source (SideStore reads the same one).
// Run by the "Sync Compatibility Table" workflow after each release manifest commit, so
// a new release reaches the source with no extra step. Release notes come from the
// GitHub release; notes already in the source are reused, so only new releases are
// fetched. Without network access the release page link stands in for the notes.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const HISTORY_PATH = path.join(repoRoot, "data/builds-history.json");
const SOURCE_PATH = path.join(repoRoot, "public/sidestore.json");
const SITE = "https://xenios.jp";
const GITHUB_API_BASE = process.env.GITHUB_API_BASE || "https://api.github.com";

// Must match CFBundleIdentifier in the IPA.
const BUNDLE_ID = "com.xenios.jp";
const MIN_OS_VERSION = "26.0";
// Earlier builds are left out: 2.2 is the first build whose data an update keeps, and
// the permissions below were checked against the 2.2 to 2.2.4 IPAs only.
const MIN_LISTED_BUILD = 11445;

// AltStore refuses to install an IPA whose entitlements or usage descriptions differ
// from these, so they have to follow the app's Info.plist and entitlements file.
const APP_PERMISSIONS = {
  entitlements: [
    "com.apple.developer.coremotion.head-pose",
    "com.apple.developer.kernel.extended-virtual-addressing",
    "com.apple.developer.kernel.increased-debugging-memory-limit",
    "com.apple.developer.kernel.increased-memory-limit",
    "get-task-allow",
  ],
  privacy: {
    NSLocalNetworkUsageDescription:
      "System Link uses your local network to play with other devices running XeniOS or Xenia, and with an XLink Kai engine on your network.",
    NSMotionUsageDescription:
      "Head tracking adjusts spatial audio to your head movement when using the PHASE audio backend with supported headphones.",
  },
};

const APP_DESCRIPTION = [
  "XeniOS is an Xbox 360 emulator for iPhone and iPad, based on Xenia.",
  "",
  "Requires iOS / iPadOS 26 or later and JIT, enabled through StikDebug. See https://xenios.jp/download/ios for setup.",
  "",
  "No games are included. Use only games you dumped from discs or digital purchases you own.",
].join("\n");

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function buildKey(value) {
  return String(value ?? "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
}

function compareBuildsDescending(a, b) {
  const left = buildKey(a.buildNumber);
  const right = buildKey(b.buildNumber);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (right[i] ?? 0) - (left[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function releaseTag(sourceUrl) {
  const match = /\/releases\/tag\/([^/?#]+)/.exec(sourceUrl ?? "");
  return match ? decodeURIComponent(match[1]) : null;
}

// Keeps the change list: drops the title line, the install steps (they cover the Mac
// build too) and the build details block, which the
// version and date fields already carry.
function trimReleaseNotes(body) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const kept = [];
  let skipping = false;
  for (const line of lines) {
    if (/^# /.test(line)) continue;
    if (/^## /.test(line)) skipping = /^## (Build details|Installing)\s*$/i.test(line);
    if (!skipping) kept.push(line);
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function fetchReleaseNotes(tag) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "xenios-website-sidestore-source",
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/xenios-jp/XeniOS/releases/tags/${encodeURIComponent(tag)}`,
      { headers },
    );
    if (!response.ok) {
      console.warn(`release notes for ${tag}: HTTP ${response.status}`);
      return null;
    }
    const release = await response.json();
    return typeof release.body === "string" && release.body.trim()
      ? trimReleaseNotes(release.body)
      : null;
  } catch (error) {
    console.warn(`release notes for ${tag}: ${error.message}`);
    return null;
  }
}

function ipaArtifact(build) {
  return (build.artifacts ?? []).find(
    (artifact) => artifact?.kind === "ipa" && artifact.downloadUrl && Number(artifact.sizeBytes) > 0,
  );
}

async function main() {
  const history = await readJson(HISTORY_PATH, { builds: [] });
  const previous = await readJson(SOURCE_PATH, null);

  // Notes already in the source, by build number, so old releases aren't refetched.
  const knownNotes = new Map();
  for (const version of previous?.apps?.[0]?.versions ?? []) {
    if (version?.buildVersion && version.localizedDescription && !version.notesFallback) {
      knownNotes.set(String(version.buildVersion), version.localizedDescription);
    }
  }

  const seen = new Set();
  const builds = (Array.isArray(history.builds) ? history.builds : [])
    .filter(
      (build) =>
        build?.platform === "ios" &&
        build.channel === "release" &&
        build.official !== false &&
        build.stage === "stable" &&
        buildKey(build.buildNumber)[0] >= MIN_LISTED_BUILD &&
        ipaArtifact(build),
    )
    .sort(compareBuildsDescending)
    .filter((build) => {
      const key = String(build.buildNumber);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (builds.length === 0) {
    throw new Error("no official iOS release builds to list in the SideStore source");
  }

  const versions = [];
  for (const build of builds) {
    const artifact = ipaArtifact(build);
    const buildVersion = String(build.buildNumber);
    let notes = knownNotes.get(buildVersion) ?? null;
    let fallback = false;
    if (!notes) {
      const tag = releaseTag(build.sourceUrl);
      notes = tag ? await fetchReleaseNotes(tag) : null;
    }
    if (!notes) {
      notes = `XeniOS ${build.appVersion} (build ${buildVersion}). Release notes: ${build.sourceUrl}`;
      fallback = true;
    }
    const version = {
      version: String(build.appVersion),
      buildVersion,
      date: build.publishedAt,
      localizedDescription: notes,
      downloadURL: artifact.downloadUrl,
      size: Number(artifact.sizeBytes),
      minOSVersion: MIN_OS_VERSION,
    };
    // Marks notes to fetch again on the next run; not part of the source format.
    if (fallback) version.notesFallback = true;
    versions.push(version);
  }

  const latest = versions[0];
  const app = {
    name: "XeniOS",
    bundleIdentifier: BUNDLE_ID,
    developerName: "XeniOS",
    subtitle: "Xbox 360 emulator for iPhone and iPad.",
    localizedDescription: APP_DESCRIPTION,
    iconURL: `${SITE}/sidestore/icon.png`,
    tintColor: "#10B981",
    category: "games",
    versions,
    appPermissions: APP_PERMISSIONS,
    // Pre-2.0 AltStore and older SideStore read only these top-level fields.
    version: latest.version,
    versionDate: latest.date,
    versionDescription: latest.localizedDescription,
    downloadURL: latest.downloadURL,
    size: latest.size,
  };

  const source = {
    name: "XeniOS",
    identifier: "jp.xenios.source",
    sourceURL: `${SITE}/sidestore.json`,
    subtitle: "Official XeniOS releases.",
    description: "Official XeniOS builds for iPhone and iPad, from the GitHub releases of xenios-jp/XeniOS.",
    iconURL: `${SITE}/sidestore/icon.png`,
    website: `${SITE}/download/ios`,
    tintColor: "#10B981",
    featuredApps: [BUNDLE_ID],
    apps: [app],
    news: [],
  };

  await fs.mkdir(path.dirname(SOURCE_PATH), { recursive: true });
  await fs.writeFile(SOURCE_PATH, `${JSON.stringify(source, null, 2)}\n`, "utf8");
  console.log(
    `public/sidestore.json: ${versions.length} versions, latest ${latest.version} (${latest.buildVersion})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
