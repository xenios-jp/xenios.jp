/**
 * XeniOS Compatibility Report API
 *
 * Cloudflare Worker that receives compatibility reports from three channels:
 *  - App (iOS/macOS) via POST /report (Bearer token auth)
 *  - Discord via POST /discord (Ed25519 verified slash command + modal)
 *  - GitHub via manual issue → GitHub Action (which calls POST /report or commits directly)
 *
 * Each report flows through processReport() which:
 *  1. Commits the updated compatibility.json to GitHub
 *  2. Creates or updates a GitHub issue (one issue per game)
 *  3. Posts a rich embed to Discord
 *
 * Public endpoints:
 *  - GET /games   — fetch all games (for app UI)
 *  - GET /schema  — fetch valid field values (for dynamic UI + self-documenting API)
 *  - GET /health  — health check
 *
 * Secrets (set via `wrangler secret put <KEY>`):
 *  - GITHUB_TOKEN            : fine-grained PAT with Contents + Issues read/write
 *  - DISCORD_WEBHOOK         : webhook URL from your #compat-reports channel
 *  - API_KEY                 : shared secret embedded in the app
 *  - DISCORD_APPLICATION_ID  : Discord application ID (for interactions)
 *  - DISCORD_PUBLIC_KEY      : Discord public key (for Ed25519 verification)
 *  - COMPAT_BUILD_ATTESTATION_HMAC_KEY : HMAC key used to verify CI build attestations
 *  - COMPAT_BUILD_ATTESTATION_KEY_ID   : optional key id expected in attested build payloads
 */

// ── Types ────────────────────────────────────────────────────────────

interface Env {
  GITHUB_TOKEN: string;
  DISCORD_WEBHOOK: string;
  DISCORD_BOARD_WEBHOOK?: string;   // optional — falls back to DISCORD_WEBHOOK
  DISCORD_BOARD_MESSAGE_ID?: string;
  API_KEY: string;
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
  COMPAT_REPO_OWNER?: string;
  COMPAT_REPO_NAME?: string;
  COMPAT_REPO_BRANCH?: string;
  COMPAT_RELEASE_MANIFEST_URL?: string;
  COMPAT_WEBSITE_BASE?: string;
  COMPAT_BUILD_ATTESTATION_HMAC_KEY?: string;
  COMPAT_BUILD_ATTESTATION_KEY_ID?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}

type GameStatus = "playable" | "ingame" | "intro" | "loads" | "nothing";
type SummaryStatus = GameStatus | "untested";
type PerfTier = "great" | "ok" | "poor" | "n/a";
type Platform = "ios" | "macos";
type Architecture = "arm64" | "x86_64";
type GpuBackend = "msc" | "msl";
type BuildChannel = "release" | "preview" | "self-built";
type BuildStage = "alpha" | "beta" | "rc" | "stable";
type SummaryChannel = "release" | "preview" | "all";

type ReportSource = "app" | "discord" | "github";

interface BuildInfo {
  buildId?: string;
  channel: BuildChannel;
  official: boolean;
  appVersion?: string;
  buildNumber?: string;
  stage?: BuildStage;
  commitShort?: string;
  publishedAt?: string;
}

interface BuildAttestationInput {
  payload: string;
  signature: string;
}

interface ReportPayload {
  titleId: string;
  title: string;
  status: GameStatus;
  perf: PerfTier;
  platform: Platform;
  device: string;
  osVersion: string;
  arch: Architecture;
  gpuBackend: GpuBackend;
  notes: string;
  tags?: string[];
  screenshots?: string[];
  build: BuildInfo;
  buildAttestation?: BuildAttestationInput;
}

interface GameReport {
  device: string;
  platform: Platform;
  osVersion: string;
  arch: Architecture;
  gpuBackend: GpuBackend;
  status: GameStatus;
  perf?: PerfTier;
  date: string;
  notes: string;
  submittedBy?: string;
  source?: ReportSource;
  build?: BuildInfo;
}

interface GameSummary {
  channel: SummaryChannel;
  status: SummaryStatus;
  perf: PerfTier | null;
  notes: string;
  updatedAt: string | null;
  reportCount: number;
  latestReport: GameReport | null;
  bestReport: GameReport | null;
}

interface GameSummaries {
  release: GameSummary;
  preview: GameSummary;
  all: GameSummary;
}

interface Game {
  slug: string;
  title: string;
  titleId: string;
  status: GameStatus;
  perf: PerfTier;
  tags: string[];
  platforms: Platform[];
  lastReport: {
    device: string;
    platform: Platform;
    osVersion: string;
    arch: Architecture;
    gpuBackend: GpuBackend;
  };
  updatedAt: string;
  notes: string;
  reports: GameReport[];
  screenshots: string[];
  summaries?: GameSummaries;
  issueNumber?: number;
  issueUrl?: string;
}

interface PipelineResult {
  success: boolean;
  game: string;
  status: GameStatus;
  issueUrl: string;
  error?: string;
}

// ── Config ───────────────────────────────────────────────────────────

const COMPAT_PATH = "data/compatibility.json";
const SCREENSHOT_PATH = "public/compatibility/screenshots";
const DEFAULT_COMPAT_REPO_OWNER = "xenios-jp";
const DEFAULT_COMPAT_REPO_NAME = "game-compatibility";
const DEFAULT_COMPAT_REPO_BRANCH = "main";
const DEFAULT_RELEASE_MANIFEST_URL =
  "https://raw.githubusercontent.com/xenios-jp/xenios.jp/main/data/release-builds.json";
const DEFAULT_WEBSITE_BASE = "https://xenios.jp";

// ── Schema (single source of truth for valid values) ─────────────────
// When adding new platforms, GPU backends, etc., update these arrays.
// The /schema endpoint, validation, and Discord command choices all
// derive from these definitions.

const SCHEMA = {
  statuses: [
    { value: "playable" as GameStatus, label: "Playable", description: "Game can be played start to finish with minor issues" },
    { value: "ingame" as GameStatus, label: "In-Game", description: "Reaches gameplay but has significant issues" },
    { value: "intro" as GameStatus, label: "Intro", description: "Gets past loading but crashes before or during gameplay" },
    { value: "loads" as GameStatus, label: "Loads", description: "Boots and shows menus but can't reach gameplay" },
    { value: "nothing" as GameStatus, label: "Doesn't Boot", description: "Does not boot or crashes immediately" },
  ],
  perfTiers: [
    { value: "great" as PerfTier, label: "Great", description: "Runs at or near full speed" },
    { value: "ok" as PerfTier, label: "OK", description: "Playable but with noticeable performance drops" },
    { value: "poor" as PerfTier, label: "Poor", description: "Significant performance issues" },
    { value: "n/a" as PerfTier, label: "N/A", description: "Not applicable (game doesn't boot)" },
  ],
  platforms: [
    { value: "ios" as Platform, label: "iOS", description: "iOS and iPadOS devices" },
    { value: "macos" as Platform, label: "macOS", description: "macOS devices" },
  ],
  architectures: [
    { value: "arm64" as Architecture, label: "ARM64", description: "Apple Silicon (all iOS, Apple Silicon Macs)" },
    { value: "x86_64" as Architecture, label: "x86_64", description: "Intel (Intel Macs only)" },
  ],
  gpuBackends: [
    { value: "msl" as GpuBackend, label: "MSL", description: "Metal Shading Language (all platforms)" },
    { value: "msc" as GpuBackend, label: "MSC", description: "Metal Shader Converter (macOS 15+ only)" },
  ],
} as const;

const VALID_STATUSES = SCHEMA.statuses.map((s) => s.value);
const VALID_PERFS = SCHEMA.perfTiers.map((p) => p.value);
const VALID_PLATFORMS = SCHEMA.platforms.map((p) => p.value);
const VALID_ARCHS = SCHEMA.architectures.map((a) => a.value);
const VALID_GPU_BACKENDS = SCHEMA.gpuBackends.map((g) => g.value);
const VALID_BUILD_CHANNELS: BuildChannel[] = ["release", "preview", "self-built"];
const VALID_BUILD_STAGES: BuildStage[] = ["alpha", "beta", "rc", "stable"];
const STATUS_RANK: Record<GameStatus, number> = {
  playable: 4,
  ingame: 3,
  intro: 2,
  loads: 1,
  nothing: 0,
};

function compatRepoOwner(env?: Env): string {
  return env?.COMPAT_REPO_OWNER || DEFAULT_COMPAT_REPO_OWNER;
}

function compatRepoName(env?: Env): string {
  return env?.COMPAT_REPO_NAME || DEFAULT_COMPAT_REPO_NAME;
}

function compatRepoBranch(env?: Env): string {
  return env?.COMPAT_REPO_BRANCH || DEFAULT_COMPAT_REPO_BRANCH;
}

function compatWebsiteBase(env?: Env): string {
  return env?.COMPAT_WEBSITE_BASE || DEFAULT_WEBSITE_BASE;
}

function releaseManifestUrl(env?: Env): string {
  return env?.COMPAT_RELEASE_MANIFEST_URL || DEFAULT_RELEASE_MANIFEST_URL;
}

// ── Helpers ──────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeBuildFragment(value: string | undefined): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeBuildId(
  platform: Platform,
  channel: BuildChannel,
  appVersion?: string,
  buildNumber?: string
): string | undefined {
  const parts = [
    sanitizeBuildFragment(platform),
    sanitizeBuildFragment(channel),
    sanitizeBuildFragment(appVersion),
    sanitizeBuildFragment(buildNumber),
  ].filter(Boolean);
  return parts.length >= 3 ? parts.join("-") : undefined;
}

const BUILD_ATTESTATION_PREFIX = "xenios-build-attestation-v1";
const REPORT_METADATA_PREFIX = "xenios-report-meta:";

function normalizeBuildStage(value: unknown): BuildStage | undefined {
  return VALID_BUILD_STAGES.includes(value as BuildStage)
    ? (value as BuildStage)
    : undefined;
}

function getBuildStageDisplayLabel(stage?: BuildStage): string | null {
  switch (stage) {
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

function formatBuildDisplayLabel(build: BuildInfo): string {
  const versionLabel = build.appVersion
    ? build.buildNumber
      ? `${build.appVersion} (${build.buildNumber})`
      : build.appVersion
    : build.buildId ?? "Unknown build";
  const stageLabel = getBuildStageDisplayLabel(build.stage);

  if (build.channel === "preview") {
    return stageLabel ? `${stageLabel} Preview ${versionLabel}` : `Preview ${versionLabel}`;
  }
  if (build.channel === "release") {
    return stageLabel ? `${stageLabel} ${versionLabel}` : versionLabel;
  }
  return versionLabel;
}

function normalizeBuildInfo(platform: Platform, build: BuildInfo): BuildInfo {
  const normalized: BuildInfo = {
    channel: build.channel,
    official: build.official,
  };

  if (build.appVersion?.trim()) normalized.appVersion = build.appVersion.trim();
  if (build.buildNumber?.trim()) normalized.buildNumber = build.buildNumber.trim();
  if (normalizeBuildStage(build.stage)) normalized.stage = build.stage;
  if (build.commitShort?.trim()) normalized.commitShort = build.commitShort.trim();
  if (build.publishedAt?.trim()) normalized.publishedAt = build.publishedAt.trim();
  normalized.buildId =
    build.buildId?.trim() ||
    makeBuildId(platform, normalized.channel, normalized.appVersion, normalized.buildNumber);

  return normalized;
}

function downgradeBuildTrust(platform: Platform, build: BuildInfo): BuildInfo {
  return normalizeBuildInfo(platform, {
    buildId: makeBuildId(platform, "self-built", build.appVersion, build.buildNumber),
    channel: "self-built",
    official: false,
    appVersion: build.appVersion,
    buildNumber: build.buildNumber,
    stage: build.stage,
    commitShort: build.commitShort,
    publishedAt: build.publishedAt,
  });
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left[i] ^ right[i];
  }
  return diff === 0;
}

function parseBuildAttestationPayload(
  payload: string
): {
  platform?: Platform;
  channel?: "release" | "preview";
  buildId?: string;
  appVersion?: string;
  buildNumber?: string;
  stage?: BuildStage;
  commitShort?: string;
  issuedAt?: string;
  keyId?: string;
} | null {
  const trimmed = payload.trim();
  if (!trimmed.startsWith(`${BUILD_ATTESTATION_PREFIX};`)) {
    return null;
  }

  const values = new Map<string, string>();
  for (const entry of trimmed.split(";").slice(1)) {
    const separator = entry.indexOf("=");
    if (separator <= 0) continue;
    const key = entry.slice(0, separator).trim();
    const value = entry.slice(separator + 1).trim();
    if (key && value) {
      values.set(key, value);
    }
  }

  const platform = values.get("platform");
  const channel = values.get("channel");
  if ((platform !== "ios" && platform !== "macos") || (channel !== "release" && channel !== "preview")) {
    return null;
  }

  const appVersion = values.get("appVersion");
  const buildNumber = values.get("buildNumber");
  if (!appVersion || !buildNumber) {
    return null;
  }

  return {
    platform,
    channel,
    buildId: values.get("buildId"),
    appVersion,
    buildNumber,
    stage: normalizeBuildStage(values.get("stage")),
    commitShort: values.get("commitShort"),
    issuedAt: values.get("issuedAt"),
    keyId: values.get("keyId"),
  };
}

async function signBuildAttestationPayload(
  payload: string,
  secret: string
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return new Uint8Array(signature);
}

async function applyBuildTrust(
  env: Env,
  report: ReportPayload,
  source: ReportSource
): Promise<ReportPayload> {
  const claimedBuild = normalizeBuildInfo(report.platform, report.build);
  const claimedAttestation = report.buildAttestation;
  const attestationSecret = env.COMPAT_BUILD_ATTESTATION_HMAC_KEY?.trim();
  const expectedKeyId = env.COMPAT_BUILD_ATTESTATION_KEY_ID?.trim();

  if (source !== "app" || !attestationSecret || !claimedAttestation) {
    return {
      ...report,
      build: downgradeBuildTrust(report.platform, claimedBuild),
      buildAttestation: undefined,
    };
  }

  const parsed = parseBuildAttestationPayload(claimedAttestation.payload);
  if (!parsed || parsed.platform !== report.platform) {
    return {
      ...report,
      build: downgradeBuildTrust(report.platform, claimedBuild),
      buildAttestation: undefined,
    };
  }

  if (expectedKeyId && parsed.keyId !== expectedKeyId) {
    return {
      ...report,
      build: downgradeBuildTrust(report.platform, claimedBuild),
      buildAttestation: undefined,
    };
  }

  let expectedSignature: Uint8Array;
  let suppliedSignature: Uint8Array;
  try {
    expectedSignature = await signBuildAttestationPayload(claimedAttestation.payload, attestationSecret);
    suppliedSignature = base64UrlToBytes(claimedAttestation.signature);
  } catch {
    return {
      ...report,
      build: downgradeBuildTrust(report.platform, claimedBuild),
      buildAttestation: undefined,
    };
  }

  if (!timingSafeEqual(expectedSignature, suppliedSignature)) {
    return {
      ...report,
      build: downgradeBuildTrust(report.platform, claimedBuild),
      buildAttestation: undefined,
    };
  }

  const attestedBuild = normalizeBuildInfo(report.platform, {
    buildId: parsed.buildId,
    channel: parsed.channel,
    official: true,
    appVersion: parsed.appVersion,
    buildNumber: parsed.buildNumber,
    stage: parsed.stage,
    commitShort: parsed.commitShort,
    publishedAt: parsed.issuedAt,
  });

  const claimedBuildId =
    claimedBuild.buildId ||
    makeBuildId(report.platform, claimedBuild.channel, claimedBuild.appVersion, claimedBuild.buildNumber);
  const attestedBuildId =
    attestedBuild.buildId ||
    makeBuildId(report.platform, attestedBuild.channel, attestedBuild.appVersion, attestedBuild.buildNumber);

  if (
    (claimedBuild.appVersion && attestedBuild.appVersion && claimedBuild.appVersion !== attestedBuild.appVersion) ||
    (claimedBuild.buildNumber && attestedBuild.buildNumber && claimedBuild.buildNumber !== attestedBuild.buildNumber) ||
    (parsed.stage && claimedBuild.stage && claimedBuild.stage !== parsed.stage) ||
    (claimedBuild.commitShort && attestedBuild.commitShort && claimedBuild.commitShort !== attestedBuild.commitShort) ||
    (claimedBuildId && attestedBuildId && claimedBuildId !== attestedBuildId)
  ) {
    return {
      ...report,
      build: downgradeBuildTrust(report.platform, claimedBuild),
      buildAttestation: undefined,
    };
  }

  return {
    ...report,
    build: attestedBuild,
    buildAttestation: undefined,
  };
}

function encodeReportMetadata(source: ReportSource, build: BuildInfo): string {
  const payload = JSON.stringify({ source, build });
  return bytesToBase64Url(new TextEncoder().encode(payload));
}

function buildReportMetadataComment(source: ReportSource, build: BuildInfo): string {
  return `<!-- ${REPORT_METADATA_PREFIX}${encodeReportMetadata(source, build)} -->`;
}

function cors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(response.body, { status: response.status, headers });
}

function jsonResponse(data: unknown, status = 200): Response {
  return cors(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function hexToUint8Array(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g);
  if (!pairs) return new Uint8Array(0);
  return new Uint8Array(pairs.map((byte) => parseInt(byte, 16)));
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(
    view.byteOffset,
    view.byteOffset + view.byteLength
  ) as ArrayBuffer;
}

// ── Validation ───────────────────────────────────────────────────────

function validatePayload(body: unknown): { ok: true; data: ReportPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;

  if (!b.titleId || typeof b.titleId !== "string") return { ok: false, error: "titleId is required" };
  if (!b.title || typeof b.title !== "string") return { ok: false, error: "title is required" };
  if (!VALID_STATUSES.includes(b.status as GameStatus)) return { ok: false, error: `status must be one of: ${VALID_STATUSES.join(", ")}` };
  // Auto-set perf to "n/a" when status is "nothing" and perf not provided
  if (b.status === "nothing" && (!b.perf || b.perf === "n/a")) {
    b.perf = "n/a";
  } else if (b.status !== "nothing" && b.perf === "n/a") {
    return { ok: false, error: "perf 'n/a' is only valid when status is 'nothing'" };
  }
  if (!VALID_PERFS.includes(b.perf as PerfTier)) return { ok: false, error: `perf must be one of: ${VALID_PERFS.join(", ")}` };
  if (!VALID_PLATFORMS.includes(b.platform as Platform)) return { ok: false, error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` };
  if (!b.device || typeof b.device !== "string") return { ok: false, error: "device is required" };
  if (!b.osVersion || typeof b.osVersion !== "string") return { ok: false, error: "osVersion is required" };
  if (!VALID_ARCHS.includes(b.arch as Architecture)) return { ok: false, error: `arch must be one of: ${VALID_ARCHS.join(", ")}` };
  if (!VALID_GPU_BACKENDS.includes(b.gpuBackend as GpuBackend)) return { ok: false, error: `gpuBackend must be one of: ${VALID_GPU_BACKENDS.join(", ")}` };
  if (!b.notes || typeof b.notes !== "string") return { ok: false, error: "notes is required" };
  if (!b.build || typeof b.build !== "object") {
    return { ok: false, error: "build metadata is required" };
  }

  const build = b.build as Record<string, unknown>;
  if (!VALID_BUILD_CHANNELS.includes(build.channel as BuildChannel)) {
    return {
      ok: false,
      error: `build.channel must be one of: ${VALID_BUILD_CHANNELS.join(", ")}`,
    };
  }
  if (typeof build.official !== "boolean") {
    return { ok: false, error: "build.official must be a boolean" };
  }
  if (!build.appVersion || typeof build.appVersion !== "string") {
    return { ok: false, error: "build.appVersion is required" };
  }
  if (!build.buildNumber || typeof build.buildNumber !== "string") {
    return { ok: false, error: "build.buildNumber is required" };
  }
  if (build.buildId !== undefined && typeof build.buildId !== "string") {
    return { ok: false, error: "build.buildId must be a string" };
  }
  if (build.commitShort !== undefined && typeof build.commitShort !== "string") {
    return { ok: false, error: "build.commitShort must be a string" };
  }
  if (build.publishedAt !== undefined && typeof build.publishedAt !== "string") {
    return { ok: false, error: "build.publishedAt must be a string" };
  }
  if (build.stage !== undefined && !VALID_BUILD_STAGES.includes(build.stage as BuildStage)) {
    return {
      ok: false,
      error: `build.stage must be one of: ${VALID_BUILD_STAGES.join(", ")}`,
    };
  }
  let buildAttestation: BuildAttestationInput | undefined;
  if (build.attestation !== undefined) {
    if (!build.attestation || typeof build.attestation !== "object") {
      return { ok: false, error: "build.attestation must be an object" };
    }
    const attestation = build.attestation as Record<string, unknown>;
    if (!attestation.payload || typeof attestation.payload !== "string") {
      return { ok: false, error: "build.attestation.payload must be a string" };
    }
    if (!attestation.signature || typeof attestation.signature !== "string") {
      return { ok: false, error: "build.attestation.signature must be a string" };
    }
    buildAttestation = {
      payload: attestation.payload.trim(),
      signature: attestation.signature.trim(),
    };
  }
  if (b.screenshots !== undefined) {
    if (!Array.isArray(b.screenshots)) {
      return { ok: false, error: "screenshots must be an array" };
    }
    if (b.screenshots.length > 5) {
      return { ok: false, error: "screenshots cannot contain more than 5 images" };
    }
    if (!b.screenshots.every((s) => typeof s === "string" && s.trim().length > 0)) {
      return { ok: false, error: "screenshots must only contain non-empty strings" };
    }
  }

  // Cross-validate: iOS must use MSL
  if (b.platform === "ios" && b.gpuBackend !== "msl") {
    return { ok: false, error: "iOS platform only supports MSL GPU backend" };
  }

  return {
    ok: true,
    data: {
      titleId: (b.titleId as string).toUpperCase().trim(),
      title: (b.title as string).trim(),
      status: b.status as GameStatus,
      perf: b.perf as PerfTier,
      platform: b.platform as Platform,
      device: (b.device as string).trim(),
      osVersion: (b.osVersion as string).trim(),
      arch: b.arch as Architecture,
      gpuBackend: b.gpuBackend as GpuBackend,
      notes: (b.notes as string).trim(),
      tags: Array.isArray(b.tags) ? b.tags.filter((t): t is string => typeof t === "string") : undefined,
      screenshots: Array.isArray(b.screenshots)
        ? b.screenshots
            .filter((s): s is string => typeof s === "string")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      buildAttestation,
      build: normalizeBuildInfo(b.platform as Platform, {
        buildId: typeof build.buildId === "string" ? build.buildId : undefined,
        channel: build.channel as BuildChannel,
        official: build.official as boolean,
        appVersion: build.appVersion as string,
        buildNumber: build.buildNumber as string,
        stage: typeof build.stage === "string" ? (build.stage as BuildStage) : undefined,
        commitShort: typeof build.commitShort === "string" ? build.commitShort : undefined,
        publishedAt: typeof build.publishedAt === "string" ? build.publishedAt : undefined,
      }),
    },
  };
}

// ── GitHub API ───────────────────────────────────────────────────────

async function githubFetch(path: string, token: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "xenios-compat-api",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
}

function encodeGitHubPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function githubRawUrl(env: Env, path: string): string {
  return `https://raw.githubusercontent.com/${compatRepoOwner(env)}/${compatRepoName(env)}/${compatRepoBranch(env)}/${path}`;
}

async function commitFileToGitHub(
  env: Env,
  token: string,
  path: string,
  base64Content: string,
  message: string
): Promise<void> {
  const res = await githubFetch(
    `/repos/${compatRepoOwner(env)}/${compatRepoName(env)}/contents/${encodeGitHubPath(path)}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: base64Content,
        branch: compatRepoBranch(env),
      }),
    }
  );

  if (!res.ok) throw new Error(`GitHub file upload failed: ${res.status} ${await res.text()}`);
}

async function getFileFromGitHub(env: Env, token: string): Promise<{ content: Game[]; sha: string }> {
  const res = await githubFetch(
    `/repos/${compatRepoOwner(env)}/${compatRepoName(env)}/contents/${COMPAT_PATH}?ref=${compatRepoBranch(env)}`,
    token
  );

  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status} ${await res.text()}`);

  const json = (await res.json()) as { content: string; sha: string };
  const bytes = Uint8Array.from(atob(json.content.replace(/\n/g, "")), (c) => c.charCodeAt(0));
  const decoded = new TextDecoder().decode(bytes);
  return { content: JSON.parse(decoded) as Game[], sha: json.sha };
}

async function commitToGitHub(env: Env, token: string, games: Game[], sha: string, message: string): Promise<void> {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(games, null, 2) + "\n")));

  const res = await githubFetch(`/repos/${compatRepoOwner(env)}/${compatRepoName(env)}/contents/${COMPAT_PATH}`, token, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: encoded,
      sha,
      branch: compatRepoBranch(env),
    }),
  });

  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status} ${await res.text()}`);
}

// ── GitHub Issue Management (One Issue Per Game) ─────────────────────

async function findExistingIssue(
  env: Env,
  token: string,
  titleId: string
): Promise<{ number: number; labels: string[] } | null> {
  // Use the issues list API (instant) instead of search API (has indexing delays).
  // Filter by compat-report label and check title prefix for the titleId.
  const res = await githubFetch(
    `/repos/${compatRepoOwner(env)}/${compatRepoName(env)}/issues?labels=compat-report&state=open&per_page=100`,
    token
  );

  if (!res.ok) {
    console.error(`GitHub issues list failed: ${res.status} ${await res.text()}`);
    return null;
  }

  const issues = (await res.json()) as Array<{ number: number; title: string; labels: Array<{ name: string }> }>;

  const match = issues.find((issue) => issue.title.startsWith(`${titleId} `));
  if (match) {
    return {
      number: match.number,
      labels: match.labels.map((l) => l.name),
    };
  }

  return null;
}

const SOURCE_FOOTERS: Record<ReportSource, string> = {
  app: "*Submitted via XeniOS in-app reporter*",
  discord: "*Submitted via Discord /report*",
  github: "*Submitted via GitHub issue*",
};

function buildReportBody(report: ReportPayload, source: ReportSource, screenshotUrls: string[] = [], submittedBy?: string): string {
  const statusEmoji: Record<GameStatus, string> = {
    playable: "\u2705",
    ingame: "\uD83D\uDFE6",
    intro: "\uD83D\uDFE8",
    loads: "\uD83D\uDFE7",
    nothing: "\uD83D\uDD34",
  };

  const platformDisplay = report.platform === "ios" ? "iOS" : "macOS";

  const lines = [
    `## Compatibility Report`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Title** | ${report.title} |`,
    `| **Title ID** | \`${report.titleId}\` |`,
    `| **Status** | ${statusEmoji[report.status]} ${report.status} |`,
    `| **Performance** | ${report.perf} |`,
    `| **Platform** | ${platformDisplay} |`,
    `| **Device** | ${deviceDisplayName(report.device)} |`,
    `| **OS Version** | ${platformDisplay} ${report.osVersion} |`,
    `| **Architecture** | ${report.arch} |`,
    `| **GPU Backend** | ${report.gpuBackend.toUpperCase()} |`,
    `| **Build Channel** | ${report.build.channel} |`,
    `| **Build Trust** | ${report.build.official ? "Verified CI build" : "Self-built / unverified"} |`,
    `| **XeniOS Version** | ${report.build.appVersion ?? "Unknown"} |`,
    `| **Build Number** | ${report.build.buildNumber ?? "Unknown"} |`,
    ...(report.build.stage ? [`| **Build Stage** | ${report.build.stage} |`] : []),
    ...(report.build.commitShort ? [`| **Commit Short** | \`${report.build.commitShort}\` |`] : []),
    ...(submittedBy ? [`| **Submitted By** | ${submittedBy} |`] : []),
    ``,
    `### Notes`,
    report.notes,
  ];

  if (screenshotUrls.length > 0) {
    lines.push(``, screenshotUrls.length === 1 ? `### Screenshot` : `### Screenshots`);
    screenshotUrls.forEach((url, index) => {
      lines.push(`![screenshot ${index + 1}](${url})`);
    });
  }

  lines.push(``, `---`, SOURCE_FOOTERS[source], buildReportMetadataComment(source, report.build), `<!-- xenios-auto -->`);

  return lines.join("\n");
}

function buildLabels(report: ReportPayload): string[] {
  return [
    "compat-report",
    `state:${report.status}`,
    `perf:${report.perf}`,
    `platform:${report.platform}`,
    `gpu:${report.gpuBackend}`,
    `channel:${report.build.channel}`,
  ];
}

async function createNewIssue(
  env: Env,
  token: string,
  report: ReportPayload,
  source: ReportSource,
  screenshotUrls: string[] = [],
  submittedBy?: string
): Promise<string> {
  const body = buildReportBody(report, source, screenshotUrls, submittedBy);
  const labels = buildLabels(report);

  const res = await githubFetch(`/repos/${compatRepoOwner(env)}/${compatRepoName(env)}/issues`, token, {
    method: "POST",
    body: JSON.stringify({
      title: `${report.titleId} \u2014 ${report.title}`,
      body,
      labels,
    }),
  });

  if (!res.ok) throw new Error(`GitHub issue creation failed: ${res.status} ${await res.text()}`);

  const issue = (await res.json()) as { html_url: string };
  return issue.html_url;
}

async function addCommentToIssue(
  env: Env,
  token: string,
  issueNumber: number,
  report: ReportPayload,
  source: ReportSource,
  screenshotUrls: string[] = [],
  submittedBy?: string
): Promise<string> {
  const body = buildReportBody(report, source, screenshotUrls, submittedBy);

  const res = await githubFetch(`/repos/${compatRepoOwner(env)}/${compatRepoName(env)}/issues/${issueNumber}/comments`, token, {
    method: "POST",
    body: JSON.stringify({ body }),
  });

  if (!res.ok) throw new Error(`GitHub comment creation failed: ${res.status} ${await res.text()}`);

  return `https://github.com/${compatRepoOwner(env)}/${compatRepoName(env)}/issues/${issueNumber}`;
}

async function updateIssueLabels(
  env: Env,
  token: string,
  issueNumber: number,
  existingLabels: string[],
  report: ReportPayload
): Promise<void> {
  const kept = existingLabels.filter((l) => !l.startsWith("state:") && !l.startsWith("perf:"));

  const newLabels = new Set(kept);
  newLabels.add("compat-report");
  newLabels.add(`state:${report.status}`);
  newLabels.add(`perf:${report.perf}`);
  newLabels.add(`platform:${report.platform}`);
  newLabels.add(`gpu:${report.gpuBackend}`);
  newLabels.add(`channel:${report.build.channel}`);

  const res = await githubFetch(`/repos/${compatRepoOwner(env)}/${compatRepoName(env)}/issues/${issueNumber}`, token, {
    method: "PATCH",
    body: JSON.stringify({ labels: [...newLabels] }),
  });

  if (!res.ok) {
    console.error(`GitHub label update failed: ${res.status} ${await res.text()}`);
  }
}

async function createOrUpdateIssue(
  env: Env,
  token: string,
  report: ReportPayload,
  source: ReportSource,
  screenshotUrls: string[] = [],
  submittedBy?: string
): Promise<string> {
  const existing = await findExistingIssue(env, token, report.titleId);

  if (existing) {
    const [issueUrl] = await Promise.all([
      addCommentToIssue(env, token, existing.number, report, source, screenshotUrls, submittedBy),
      updateIssueLabels(env, token, existing.number, existing.labels, report),
    ]);
    return issueUrl;
  }

  return createNewIssue(env, token, report, source, screenshotUrls, submittedBy);
}

type ReleaseBuildManifest = {
  platforms?: Partial<
    Record<
      Platform,
      Partial<Record<Exclude<SummaryChannel, "all">, Partial<BuildInfo> | null>>
    >
  >;
};

function getCurrentBuild(
  releaseBuilds: ReleaseBuildManifest | null,
  platform: Platform,
  channel: Exclude<SummaryChannel, "all">
): Partial<BuildInfo> | null {
  return releaseBuilds?.platforms?.[platform]?.[channel] ?? null;
}

function reportMatchesSummaryChannel(
  report: GameReport,
  releaseBuilds: ReleaseBuildManifest | null,
  channel: SummaryChannel
): boolean {
  if (channel === "all") return true;

  const build = report.build;
  const currentBuild = getCurrentBuild(releaseBuilds, report.platform, channel);
  const currentBuildId =
    currentBuild && typeof currentBuild.buildId === "string" ? currentBuild.buildId : null;

  if (channel === "preview") {
    if (!build || build.channel !== "preview") return false;
    if (currentBuildId) {
      return build.buildId === currentBuildId;
    }
    return true;
  }

  if (currentBuildId) {
    return Boolean(build && build.channel === "release" && build.buildId === currentBuildId);
  }

  if (!build || !build.channel) {
    return true;
  }
  return build.channel === "release";
}

function bestReportForReports(reports: GameReport[]): GameReport | null {
  if (reports.length === 0) return null;
  return reports.reduce((best, report) => {
    const bestRank = STATUS_RANK[best.status];
    const reportRank = STATUS_RANK[report.status];
    if (reportRank > bestRank) return report;
    if (reportRank === bestRank && report.date > best.date) return report;
    return best;
  });
}

function latestReportForReports(reports: GameReport[]): GameReport | null {
  if (reports.length === 0) return null;
  return [...reports].sort((left, right) => right.date.localeCompare(left.date))[0] ?? null;
}

function buildSummaryForChannel(
  reports: GameReport[],
  releaseBuilds: ReleaseBuildManifest | null,
  channel: SummaryChannel
): GameSummary {
  const matching = reports.filter((report) => reportMatchesSummaryChannel(report, releaseBuilds, channel));
  const latestReport = latestReportForReports(matching);
  const bestReport = bestReportForReports(matching);
  return {
    channel,
    status: bestReport ? bestReport.status : "untested",
    perf: bestReport?.perf ?? null,
    notes: latestReport?.notes ?? "",
    updatedAt: latestReport?.date ?? null,
    reportCount: matching.length,
    latestReport,
    bestReport,
  };
}

function decorateGameWithSummaries(
  game: Game,
  releaseBuilds: ReleaseBuildManifest | null
): Game {
  return {
    ...game,
    summaries: {
      release: buildSummaryForChannel(game.reports, releaseBuilds, "release"),
      preview: buildSummaryForChannel(game.reports, releaseBuilds, "preview"),
      all: buildSummaryForChannel(game.reports, releaseBuilds, "all"),
    },
  };
}

function getSummaryForChannel(game: Game, channel: SummaryChannel): GameSummary {
  if (game.summaries?.[channel]) {
    return game.summaries[channel];
  }

  const fallbackReport = latestReportForReports(game.reports);
  return {
    channel,
    status: fallbackReport ? fallbackReport.status : "untested",
    perf: fallbackReport?.perf ?? game.perf ?? null,
    notes: fallbackReport?.notes ?? game.notes ?? "",
    updatedAt: fallbackReport?.date ?? game.updatedAt ?? null,
    reportCount: game.reports.length,
    latestReport: fallbackReport,
    bestReport: bestReportForReports(game.reports),
  };
}

async function fetchReleaseBuildManifest(env: Env): Promise<ReleaseBuildManifest | null> {
  try {
    const response = await fetch(releaseManifestUrl(env), {
      headers: { "User-Agent": "xenios-compat-worker" },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as ReleaseBuildManifest;
  } catch (error) {
    console.error("Failed to fetch release build manifest:", error);
    return null;
  }
}

// ── Discord Webhook ──────────────────────────────────────────────────

const STATUS_COLORS: Record<GameStatus, number> = {
  playable: 0x34d399,
  ingame: 0x60a5fa,
  intro: 0xfbbf24,
  loads: 0xfb923c,
  nothing: 0xf87171,
};

const STATUS_LABELS: Record<GameStatus, string> = {
  playable: "\u2705 Playable",
  ingame: "\uD83D\uDFE6 In-Game",
  intro: "\uD83D\uDFE8 Intro",
  loads: "\uD83D\uDFE7 Loads",
  nothing: "\uD83D\uDD34 Nothing",
};

const PERF_LABELS: Record<PerfTier, string> = {
  great: "\uD83D\uDE80 Great",
  ok: "\uD83D\uDC4C OK",
  poor: "\uD83D\uDC22 Poor",
  "n/a": "\u2796 N/A",
};

const PLATFORM_LABELS: Record<Platform, string> = {
  ios: "\uD83D\uDCF1 iOS",
  macos: "\uD83D\uDDA5\uFE0F macOS",
};

const SOURCE_LABELS: Record<ReportSource, string> = {
  app: "XeniOS App",
  discord: "Discord /report",
  github: "GitHub Issue",
};

async function postToDiscord(webhookUrl: string, report: ReportPayload, issueUrl: string, source: ReportSource, screenshotUrls: string[] = [], submittedBy?: string): Promise<void> {
  const desc = [
    `${STATUS_LABELS[report.status]}  \u2022  ${PERF_LABELS[report.perf]}`,
    `${PLATFORM_LABELS[report.platform]}  \u2022  ${deviceDisplayName(report.device)}`,
    `${report.build.channel}  \u2022  ${formatBuildDisplayLabel(report.build)}  \u2022  ${report.build.official ? "CI attested" : "self-built"}`,
    ``,
    report.notes.slice(0, 300) + (report.notes.length > 300 ? "..." : ""),
  ].join("\n");

  const embed: Record<string, unknown> = {
    title: report.title,
    url: issueUrl || undefined,
    description: desc,
    color: STATUS_COLORS[report.status],
    fields: [
      { name: "Build", value: formatBuildDisplayLabel(report.build), inline: true },
      { name: "Channel", value: report.build.channel, inline: true },
      ...(report.build.stage ? [{ name: "Stage", value: report.build.stage, inline: true }] : []),
      { name: "Trust", value: report.build.official ? "CI attested" : "Self-built", inline: true },
      ...(report.build.commitShort ? [{ name: "Commit", value: `\`${report.build.commitShort}\``, inline: true }] : []),
    ],
    footer: { text: submittedBy ? `${submittedBy} \u2022 ${SOURCE_LABELS[source]}` : SOURCE_LABELS[source] },
    timestamp: new Date().toISOString(),
  };

  if (screenshotUrls[0]) {
    embed.image = { url: screenshotUrls[0] };
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    console.error(`Discord webhook failed: ${res.status} ${await res.text()}`);
  }
}

// ── Compatibility Board (auto-updating Discord embed) ────────────────

const STATUS_EMOJI: Record<GameStatus, string> = {
  playable: "\u2705",
  ingame: "\uD83D\uDFE6",
  intro: "\uD83D\uDFE8",
  loads: "\uD83D\uDFE7",
  nothing: "\uD83D\uDD34",
};

const STATUS_ORDER: GameStatus[] = ["playable", "ingame", "intro", "loads", "nothing"];

const STATUS_LABEL_PLAIN: Record<GameStatus, string> = {
  playable: "Playable",
  ingame: "In-Game",
  intro: "Intro",
  loads: "Loads",
  nothing: "Nothing",
};

async function updateCompatBoard(env: Env, games: Game[]): Promise<void> {
  const webhook = env.DISCORD_BOARD_WEBHOOK || env.DISCORD_WEBHOOK;
  if (!webhook) return;
  const websiteBase = compatWebsiteBase(env);

  // Sort games: by release summary status order, then alphabetically.
  const sorted = [...games].sort((a, b) => {
    const aSummary = getSummaryForChannel(a, "release");
    const bSummary = getSummaryForChannel(b, "release");
    const aStatus = aSummary.status === "untested" ? "nothing" : aSummary.status;
    const bStatus = bSummary.status === "untested" ? "nothing" : bSummary.status;
    const si = STATUS_ORDER.indexOf(aStatus);
    const bi = STATUS_ORDER.indexOf(bStatus);
    if (si !== bi) return si - bi;
    return a.title.localeCompare(b.title);
  });

  // Build description grouped by release summary.
  const sections: string[] = [];
  for (const status of STATUS_ORDER) {
    const group = sorted.filter((g) => getSummaryForChannel(g, "release").status === status);
    if (group.length === 0) continue;
    const header = `${STATUS_EMOJI[status]} **${STATUS_LABEL_PLAIN[status]}** (${group.length})`;
    const rows = group.map(
      (g) => {
        const summary = getSummaryForChannel(g, "release");
        const device = summary.latestReport?.device || g.lastReport?.device || "Unknown";
        return `[${g.title}](${websiteBase}/compatibility/${g.slug}) \u2014 ${deviceDisplayName(device)}`;
      }
    );
    sections.push(`${header}\n${rows.join("\n")}`);
  }

  const description = sections.join("\n\n");

  // Discord embed description limit is 4096 chars. If over, truncate.
  const truncated = description.length > 4000
    ? description.slice(0, 4000) + "\n\n*...and more. See full list on the website.*"
    : description;

  const embed = {
    title: "Game Compatibility (Release)",
    description: truncated,
    color: 0x34d399,
    footer: { text: `${games.length} games \u2022 ${websiteBase.replace(/^https?:\/\//, "")}/compatibility` },
    timestamp: new Date().toISOString(),
  };

  const payload = JSON.stringify({
    embeds: [embed],
  });

  // Try to edit existing message first
  if (env.DISCORD_BOARD_MESSAGE_ID) {
    const editUrl = `${webhook}/messages/${env.DISCORD_BOARD_MESSAGE_ID}`;
    const res = await fetch(editUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    if (res.ok) return;
    console.error(`Board edit failed (${res.status}), will post new message`);
  }

  // Post new message (manual pin needed by server admin)
  const postUrl = `${webhook}?wait=true`;
  const res = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });

  if (res.ok) {
    const msg = (await res.json()) as { id: string };
    console.log(`[board] New board message posted, ID: ${msg.id}. Set DISCORD_BOARD_MESSAGE_ID=${msg.id} as a secret/var to enable editing.`);
  } else {
    console.error(`Board post failed: ${res.status} ${await res.text()}`);
  }
}

// ── Merge logic ──────────────────────────────────────────────────────

function mergeScreenshotUrls(existing: string[] = [], incoming: string[] = []): string[] {
  const merged: string[] = [];
  [...incoming, ...existing].forEach((url) => {
    if (!url || merged.includes(url)) return;
    merged.push(url);
  });
  return merged.slice(0, 20);
}

function mergeReport(
  games: Game[],
  report: ReportPayload,
  releaseBuilds: ReleaseBuildManifest | null,
  screenshotUrls: string[] = [],
  source?: ReportSource,
  submittedBy?: string
): Game[] {
  const today = todayISO();
  const newReport: GameReport = {
    device: report.device,
    platform: report.platform,
    osVersion: report.osVersion,
    arch: report.arch,
    gpuBackend: report.gpuBackend,
    status: report.status,
    perf: report.perf,
    date: today,
    notes: report.notes,
    ...(submittedBy ? { submittedBy } : {}),
    ...(source ? { source } : {}),
    build: report.build,
  };

  const idx = games.findIndex(
    (g) => g.titleId.toUpperCase() === report.titleId.toUpperCase()
  );

  if (idx >= 0) {
    const game = { ...games[idx] };
    game.reports = [newReport, ...game.reports];
    game.lastReport = {
      device: report.device,
      platform: report.platform,
      osVersion: report.osVersion,
      arch: report.arch,
      gpuBackend: report.gpuBackend,
    };
    game.updatedAt = today;
    game.status = report.status;
    game.perf = report.perf;
    game.notes = report.notes;
    game.screenshots = mergeScreenshotUrls(game.screenshots, screenshotUrls);

    if (!game.platforms.includes(report.platform)) {
      game.platforms = [...game.platforms, report.platform];
    }

    if (report.tags && report.tags.length > 0) {
      const existing = new Set(game.tags);
      report.tags.forEach((t) => existing.add(t));
      game.tags = [...existing];
    }
    const updated = [...games];
    updated[idx] = decorateGameWithSummaries(game, releaseBuilds);
    return updated;
  }

  const newGame: Game = {
    slug: slugify(report.title),
    title: report.title,
    titleId: report.titleId,
    status: report.status,
    perf: report.perf,
    tags: report.tags || [],
    platforms: [report.platform],
    lastReport: {
      device: report.device,
      platform: report.platform,
      osVersion: report.osVersion,
      arch: report.arch,
      gpuBackend: report.gpuBackend,
    },
    updatedAt: today,
    notes: report.notes,
    reports: [newReport],
    screenshots: mergeScreenshotUrls([], screenshotUrls),
  };

  return [...games, decorateGameWithSummaries(newGame, releaseBuilds)];
}

// ── Unified Pipeline ─────────────────────────────────────────────────

function inferScreenshotExtension(binary: string): string {
  if (binary.length >= 4) {
    const b0 = binary.charCodeAt(0);
    const b1 = binary.charCodeAt(1);
    const b2 = binary.charCodeAt(2);
    const b3 = binary.charCodeAt(3);
    if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) return "jpg";
    if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) return "png";
    if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46) return "gif";
    if (binary.startsWith("RIFF") && binary.slice(8, 12) === "WEBP") return "webp";
  }
  return "jpg";
}

function normalizeScreenshotContent(raw: string): { base64: string; extension: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let base64 = trimmed;
  let extension: string | undefined;
  const dataUrlMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i);
  if (dataUrlMatch) {
    base64 = dataUrlMatch[2].replace(/\s+/g, "");
    const mime = dataUrlMatch[1].toLowerCase();
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
    };
    extension = mimeToExt[mime];
  } else {
    base64 = trimmed.replace(/\s+/g, "");
  }

  try {
    const binary = atob(base64);
    return {
      base64,
      extension: extension ?? inferScreenshotExtension(binary),
    };
  } catch {
    return null;
  }
}

async function uploadReportScreenshots(
  env: Env,
  token: string,
  report: ReportPayload,
  source: ReportSource
): Promise<string[]> {
  if (!report.screenshots || report.screenshots.length === 0) {
    return [];
  }

  const uploadedUrls: string[] = [];
  const uploadStamp = Date.now();

  for (const [index, rawScreenshot] of report.screenshots.entries()) {
    const normalized = normalizeScreenshotContent(rawScreenshot);
    if (!normalized) {
      console.warn(`Skipping invalid screenshot ${index + 1} for ${report.titleId}`);
      continue;
    }

    const filePath =
      `${SCREENSHOT_PATH}/${report.titleId}/${uploadStamp}-${index + 1}.${normalized.extension}`;
    const commitMessage =
      `compat: add screenshot ${index + 1} for ${report.title} (${report.titleId}) [via ${source}]`;

    try {
      await commitFileToGitHub(env, token, filePath, normalized.base64, commitMessage);
      uploadedUrls.push(githubRawUrl(env, filePath));
    } catch (error) {
      console.error(`Screenshot upload failed for ${report.titleId} #${index + 1}:`, error);
    }
  }

  return uploadedUrls;
}

async function processReport(
  env: Env,
  report: ReportPayload,
  source: ReportSource,
  screenshotUrls: string[] = [],
  submittedBy?: string
): Promise<PipelineResult> {
  const trustedReport = await applyBuildTrust(env, report, source);

  // 1. Fetch current compatibility.json from GitHub
  const { content: games, sha } = await getFileFromGitHub(env, env.GITHUB_TOKEN);
  const releaseBuilds = await fetchReleaseBuildManifest(env);

  // 2. Merge in the new report
  const updated = mergeReport(games, trustedReport, releaseBuilds, screenshotUrls, source, submittedBy);

  // 3. Commit back to GitHub
  const platformDisplay = trustedReport.platform === "ios" ? "iOS" : "macOS";
  const commitMsg = `compat: ${trustedReport.title} \u2014 ${trustedReport.status} on ${deviceDisplayName(trustedReport.device)} (${platformDisplay}) [via ${source}]`;
  await commitToGitHub(env, env.GITHUB_TOKEN, updated, sha, commitMsg);

  // 4. Create or update GitHub issue (one issue per game)
  let issueUrl = "";
  try {
    issueUrl = await createOrUpdateIssue(env, env.GITHUB_TOKEN, trustedReport, source, screenshotUrls, submittedBy);
  } catch (e) {
    console.error("Issue creation/update failed:", e);
  }

  // 5. Post to Discord
  try {
    await postToDiscord(env.DISCORD_WEBHOOK, trustedReport, issueUrl, source, screenshotUrls, submittedBy);
  } catch (e) {
    console.error("Discord post failed:", e);
  }

  // 6. Update compatibility board channel
  try {
    await updateCompatBoard(env, updated);
  } catch (e) {
    console.error("Board update failed:", e);
  }

  return {
    success: true,
    game: trustedReport.title,
    status: trustedReport.status,
    issueUrl,
  };
}

// ── Discord Interactions (Slash Command) ─────────────────────────────

// Discord interaction types
const INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MODAL_SUBMIT: 5,
} as const;

// Discord response types
const RESPONSE_TYPE = {
  PONG: 1,
  CHANNEL_MESSAGE: 4,
  DEFERRED_CHANNEL_MESSAGE: 5,
  MODAL: 9,
} as const;

// Message flags
const FLAGS = {
  EPHEMERAL: 1 << 6,
} as const;

async function verifyDiscordSignature(request: Request, publicKey: string): Promise<{ valid: boolean; body: string }> {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  const body = await request.text();

  console.log("[discord] verifying signature, has sig:", !!signature, "has ts:", !!timestamp);

  if (!signature || !timestamp) {
    return { valid: false, body };
  }

  try {
    const keyData = hexToUint8Array(publicKey);
    const key = await crypto.subtle.importKey(
      "raw",
      toArrayBuffer(keyData),
      "Ed25519",
      false,
      ["verify"]
    );

    const encoder = new TextEncoder();
    const message = encoder.encode(timestamp + body);
    const sig = hexToUint8Array(signature);

    const valid = await crypto.subtle.verify(
      "Ed25519",
      key,
      toArrayBuffer(sig),
      toArrayBuffer(message)
    );
    console.log("[discord] signature valid:", valid);
    return { valid, body };
  } catch (e) {
    console.error("[discord] Ed25519 verification error:", e);
    return { valid: false, body };
  }
}

function discordJsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

interface DiscordAttachment {
  url: string;
  filename: string;
  content_type?: string;
}

// ── Discord modal (text fields only) ─────────────────────────────────
// All enum fields come from slash command choices (native dropdowns).
// The modal only collects free-text: Title ID, Game Name, Notes.
// Uses Action Row (type 1) + Text Input (type 4).

function buildTextModal(customId: string): unknown {
  return {
    title: "XeniOS Compatibility Report",
    custom_id: customId,
    components: [
      {
        type: 1,
        components: [{
          type: 4, custom_id: "title_id", label: "Title ID",
          style: 1, placeholder: "4D5307E6", required: true,
          min_length: 1, max_length: 20,
        }],
      },
      {
        type: 1,
        components: [{
          type: 4, custom_id: "game", label: "Game Name",
          style: 1, placeholder: "Halo 3", required: true,
          min_length: 1, max_length: 100,
        }],
      },
      {
        type: 1,
        components: [{
          type: 4, custom_id: "notes", label: "Notes",
          style: 2, placeholder: "Build version, graphical issues, crashes, etc.",
          required: true, min_length: 1, max_length: 1000,
        }],
      },
    ],
  };
}

// ── Infer platform from device name ──────────────────────────────────

function inferPlatform(device: string): "ios" | "macos" {
  if (device.startsWith("iPhone") || device.startsWith("iPad")) return "ios";
  return "macos";
}

// ── Device name mapping (raw identifier → friendly name) ────────────

import DEVICE_NAMES from "../../data/device-names.json";

function deviceDisplayName(raw: string): string {
  return (DEVICE_NAMES as Record<string, string>)[raw] || raw;
}

// ── Cache command options between slash command → modal submit ────────

interface CommandOptions {
  status: string;
  perf: string;
  device: string;
  osVersion: string;
  arch: string;
  gpuBackend: string;
  channel: BuildChannel;
  appVersion: string;
  buildNumber: string;
  commitShort: string;
  screenshotUrl: string;
  submittedBy: string;
}

async function storeCommandOptions(key: string, data: CommandOptions): Promise<void> {
  const cache = (caches as CacheStorage & { default: Cache }).default;
  const url = `https://xenios-modal.internal/cmdopts/${key}`;
  await cache.put(url, new Response(JSON.stringify(data), {
    headers: { "Cache-Control": "s-maxage=600", "Content-Type": "application/json" },
  }));
}

async function getCommandOptions(key: string): Promise<CommandOptions | null> {
  const cache = (caches as CacheStorage & { default: Cache }).default;
  const url = `https://xenios-modal.internal/cmdopts/${key}`;
  const response = await cache.match(url);
  if (!response) return null;
  try {
    return (await response.json()) as CommandOptions;
  } catch {
    return null;
  }
}

// ── Extract text input value from Action Row modal components ────────

function getModalField(components: unknown[], id: string): string {
  for (const comp of components as Array<Record<string, unknown>>) {
    if (Array.isArray(comp.components)) {
      for (const sub of comp.components as Array<Record<string, unknown>>) {
        if (sub.custom_id === id) {
          if (typeof sub.value === "string") return sub.value;
        }
      }
    }
  }
  return "";
}

// ── Interaction handler ─────────────────────────────────────────────

async function handleDiscordInteraction(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  console.log("[discord] interaction received");

  try {
    // Verify Ed25519 signature
    const { valid, body } = await verifyDiscordSignature(request, env.DISCORD_PUBLIC_KEY);
    if (!valid) {
      console.log("[discord] signature invalid, returning 401");
      return new Response("Invalid signature", { status: 401 });
    }

    const interaction = JSON.parse(body);
    console.log("[discord] interaction type:", interaction.type);

    // Handle PING (Discord verification)
    if (interaction.type === INTERACTION_TYPE.PING) {
      console.log("[discord] PING → PONG");
      return discordJsonResponse({ type: RESPONSE_TYPE.PONG });
    }

    // ── APPLICATION_COMMAND ─
    if (interaction.type === INTERACTION_TYPE.APPLICATION_COMMAND) {
      const commandName = interaction.data.name as string;
      const options = interaction.data.options || [];
      const resolved = interaction.data.resolved || {};

      const getOption = (name: string): string => {
        const opt = options.find((o: { name: string; value: string }) => o.name === name);
        return opt ? String(opt.value) : "";
      };

      // ── /support — show donation / Ko-fi link ─
      if (commandName === "support") {
        return discordJsonResponse({
          type: RESPONSE_TYPE.CHANNEL_MESSAGE,
          data: {
            embeds: [{
              title: "Support XeniOS",
              description: [
                "XeniOS is a free, open-source Xbox 360 emulator for Apple devices.",
                "",
                "If you'd like to support ongoing development, you can donate via Ko-fi:",
                "",
                "**[ko-fi.com/xenios](https://ko-fi.com/xenios)**",
                "",
                "Every contribution helps keep the project going. Thank you! \u2764\uFE0F",
              ].join("\n"),
              color: 0xff5e5b,
              url: "https://ko-fi.com/xenios",
            }],
          },
        });
      }

      // ── /compat [game] — look up compatibility ─
      if (commandName === "compat") {
        const query = getOption("game").toLowerCase().trim();

        try {
          const { content: games } = await getFileFromGitHub(env, env.GITHUB_TOKEN);
          const websiteBase = compatWebsiteBase(env);

          if (!query) {
            // No search term: show summary
            const counts: Record<SummaryStatus, number> = {
              playable: 0,
              ingame: 0,
              intro: 0,
              loads: 0,
              nothing: 0,
              untested: 0,
            };
            games.forEach((g: Game) => {
              const summary = getSummaryForChannel(g, "release");
              counts[summary.status] += 1;
            });

            const lines = [
              ...STATUS_ORDER.map((s) => `${STATUS_EMOJI[s]} **${STATUS_LABEL_PLAIN[s]}**: ${counts[s]}`),
              `⚪ **Untested**: ${counts.untested}`,
            ];

            return discordJsonResponse({
              type: RESPONSE_TYPE.CHANNEL_MESSAGE,
              data: {
                embeds: [{
                  title: "Game Compatibility (Release)",
                  description: lines.join("\n") + `\n\n**${games.length} tracked games**\n[Browse full list](${websiteBase}/compatibility)`,
                  color: 0x34d399,
                }],
                flags: FLAGS.EPHEMERAL,
              },
            });
          }

          // Search by title or title ID
          const matches = games.filter(
            (g: Game) => g.title.toLowerCase().includes(query) || g.titleId.toLowerCase().includes(query)
          ).slice(0, 5);

          if (matches.length === 0) {
            return discordJsonResponse({
              type: RESPONSE_TYPE.CHANNEL_MESSAGE,
              data: {
                content: `No games found matching "${getOption("game")}". [Browse all](${websiteBase}/compatibility)`,
                flags: FLAGS.EPHEMERAL,
              },
            });
          }

          const embeds = matches.map((g: Game) => {
            const summary = getSummaryForChannel(g, "release");
            const summaryStatus = summary.status === "untested" ? "Release untested" : STATUS_LABEL_PLAIN[summary.status];
            const device = summary.latestReport?.device || g.lastReport?.device || "Unknown";
            return ({
            title: g.title,
            url: `${websiteBase}/compatibility/${g.slug}`,
            description: (summary.notes || g.notes).slice(0, 200) + ((summary.notes || g.notes).length > 200 ? "..." : ""),
            color: summary.status === "untested" ? 0x94a3b8 : STATUS_COLORS[summary.status],
            fields: [
              { name: "Release", value: summary.status === "untested" ? "⚪ Untested" : `${STATUS_EMOJI[summary.status]} ${summaryStatus}`, inline: true },
              { name: "Device", value: deviceDisplayName(device), inline: true },
              { name: "Title ID", value: `\`${g.titleId}\``, inline: true },
            ],
            footer: { text: `Updated ${summary.updatedAt || g.updatedAt}` },
          })});

          return discordJsonResponse({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: { embeds, flags: FLAGS.EPHEMERAL },
          });
        } catch (e) {
          return discordJsonResponse({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              content: `\u274C Failed to fetch compatibility data: ${(e as Error).message}`,
              flags: FLAGS.EPHEMERAL,
            },
          });
        }
      }

      // ── /report → cache enum options, open text modal ─
      if (commandName === "report") {
        const interactionId = interaction.id as string;

        // Extract Discord username (guild context or DM)
        const discordUser = interaction.member?.user || interaction.user;
        const submittedBy = discordUser?.username || "Unknown";

        // Extract optional screenshot attachment URL
        let screenshotUrl = "";
        const screenshotId = getOption("screenshot");
        if (screenshotId && resolved.attachments) {
          const attachment = resolved.attachments[screenshotId] as DiscordAttachment | undefined;
          if (attachment?.url) screenshotUrl = attachment.url;
        }

        // Cache all enum options from slash command choices
        // Platform is inferred from device name (no separate field needed)
        const cmdOpts: CommandOptions = {
          status: getOption("status"),
          perf: getOption("perf"),
          device: getOption("device"),
          osVersion: getOption("os_version"),
          arch: getOption("arch"),
          gpuBackend: getOption("gpu"),
          channel: (getOption("channel") as BuildChannel) || "release",
          appVersion: getOption("app_version"),
          buildNumber: getOption("build_number"),
          commitShort: getOption("commit_short"),
          screenshotUrl,
          submittedBy,
        };

        console.log("[discord] command options:", JSON.stringify(cmdOpts));
        ctx.waitUntil(storeCommandOptions(interactionId, cmdOpts));

        const customId = `compat:${interactionId}`;
        console.log("[discord] opening text modal, custom_id:", customId);

        return discordJsonResponse({
          type: RESPONSE_TYPE.MODAL,
          data: buildTextModal(customId),
        });
      }

      // Unknown command
      return discordJsonResponse({
        type: RESPONSE_TYPE.CHANNEL_MESSAGE,
        data: {
          content: `Unknown command: \`/${commandName}\``,
          flags: FLAGS.EPHEMERAL,
        },
      });
    }

    // ── MODAL_SUBMIT: combine cached options with text fields → process ─
    if (interaction.type === INTERACTION_TYPE.MODAL_SUBMIT) {
      const customId = interaction.data.custom_id as string;
      const components = interaction.data.components || [];

      if (customId.startsWith("compat:")) {
        const origInteractionId = customId.slice("compat:".length);

        // Retrieve cached command options
        const cmdOpts = await getCommandOptions(origInteractionId);
        if (!cmdOpts) {
          return discordJsonResponse({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              content: "\u274C Session expired. Please run `/report` again.",
              flags: FLAGS.EPHEMERAL,
            },
          });
        }

        const rawPayload = {
          titleId: getModalField(components, "title_id").toUpperCase().trim(),
          title: getModalField(components, "game").trim(),
          status: cmdOpts.status,
          perf: cmdOpts.perf,
          platform: inferPlatform(cmdOpts.device),
          device: cmdOpts.device,
          osVersion: cmdOpts.osVersion.replace(/^m/, ""),
          arch: cmdOpts.arch,
          gpuBackend: cmdOpts.gpuBackend,
          notes: getModalField(components, "notes").trim(),
          build: {
            channel: cmdOpts.channel,
            official: cmdOpts.channel !== "self-built",
            appVersion: cmdOpts.appVersion,
            buildNumber: cmdOpts.buildNumber,
            commitShort: cmdOpts.commitShort || undefined,
          },
        };

        console.log("[discord] modal submitted, payload:", rawPayload.titleId, rawPayload.title);

        const validation = validatePayload(rawPayload);
        if (validation.ok === false) {
          return discordJsonResponse({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              content: `\u274C Validation error: ${validation.error}`,
              flags: FLAGS.EPHEMERAL,
            },
          });
        }

        const report = validation.data;
        const screenshotUrl = cmdOpts.screenshotUrl || undefined;
        const submittedBy = cmdOpts.submittedBy || undefined;

        // Respond with deferred message, process in background
        ctx.waitUntil(
          (async () => {
            try {
              const result = await processReport(
                env,
                report,
                "discord",
                screenshotUrl ? [screenshotUrl] : [],
                submittedBy
              );

              const followupUrl = `https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${interaction.token}/messages/@original`;
              const content = result.success
                ? `\u2705 **${result.game}** — ${STATUS_LABELS[result.status]}\n${result.issueUrl ? `[View on GitHub](${result.issueUrl})` : ""}`
                : `\u274C Failed to process report: ${result.error || "Unknown error"}`;

              await fetch(followupUrl, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
              });
            } catch (e) {
              console.error("Discord deferred processing failed:", e);

              const followupUrl = `https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${interaction.token}/messages/@original`;
              await fetch(followupUrl, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: `\u274C Failed to process report: ${(e as Error).message}`,
                }),
              });
            }
          })()
        );

        return discordJsonResponse({
          type: RESPONSE_TYPE.DEFERRED_CHANNEL_MESSAGE,
          data: { flags: FLAGS.EPHEMERAL },
        });
      }

      // Unknown modal
      return discordJsonResponse({
        type: RESPONSE_TYPE.CHANNEL_MESSAGE,
        data: { content: "\u274C Unknown modal submission.", flags: FLAGS.EPHEMERAL },
      });
    }

    return new Response("Unknown interaction type", { status: 400 });

  } catch (e) {
    console.error("[discord] unhandled error in interaction handler:", e);
    return new Response(`Internal error: ${(e as Error).message}`, { status: 500 });
  }
}

// ── Request handler ──────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return jsonResponse({ status: "ok", service: "xenios-compat-api" });
    }

    // GET /schema — valid field values (public, for app UI + self-documenting API)
    if (url.pathname === "/schema" && request.method === "GET") {
      return jsonResponse(SCHEMA);
    }

    // POST /report — app submissions (Bearer token auth)
    if (url.pathname === "/report" && request.method === "POST") {
      // Auth check
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || authHeader !== `Bearer ${env.API_KEY}`) {
        return errorResponse("Unauthorized", 401);
      }

      // Parse & validate
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse("Invalid JSON body");
      }

      const validation = validatePayload(body);
      if (validation.ok === false) {
        return errorResponse(validation.error);
      }

      const report = validation.data;

      try {
        const screenshotUrls = await uploadReportScreenshots(env, env.GITHUB_TOKEN, report, "app");
        const result = await processReport(env, report, "app", screenshotUrls);
        return jsonResponse(result);
      } catch (e) {
        console.error("Report processing failed:", e);
        return errorResponse(`Failed to process report: ${(e as Error).message}`, 500);
      }
    }

    // POST /discord — Discord interactions (Ed25519 verified)
    if (url.pathname === "/discord" && request.method === "POST") {
      console.log("[fetch] POST /discord hit");
      return handleDiscordInteraction(request, env, ctx);
    }

    // GET /games — public read-only endpoint for the app
    if (url.pathname === "/games" && request.method === "GET") {
      try {
        const { content: games } = await getFileFromGitHub(env, env.GITHUB_TOKEN);
        return jsonResponse(games);
      } catch (e) {
        return errorResponse(`Failed to fetch games: ${(e as Error).message}`, 500);
      }
    }

    // GET /games/:titleId/discussion — structured reports + GitHub issue link
    const discussionMatch = url.pathname.match(/^\/games\/([A-Fa-f0-9]{8})\/discussion$/);
    if (discussionMatch && request.method === "GET") {
      const titleId = discussionMatch[1].toUpperCase();
      try {
        // Get structured game data from compatibility.json.
        const { content: games } = await getFileFromGitHub(env, env.GITHUB_TOKEN);
        const game = games.find((g) => g.titleId.toUpperCase() === titleId);

        // Find linked GitHub issue (if any).
        let issueNumber: number | null = null;
        let issueUrl: string | null = null;
        const existing = await findExistingIssue(env, env.GITHUB_TOKEN, titleId);
        if (existing) {
          issueNumber = existing.number;
          issueUrl = `https://github.com/${compatRepoOwner(env)}/${compatRepoName(env)}/issues/${existing.number}`;
        }

        if (!game) {
          return jsonResponse({ found: false, titleId, reports: [], issueNumber, issueUrl });
        }

        return jsonResponse({
          found: true,
          titleId,
          title: game.title,
          status: game.status,
          perf: game.perf,
          notes: game.notes,
          updatedAt: game.updatedAt,
          issueNumber,
          issueUrl,
          reports: game.reports,
          summaries: game.summaries,
        });
      } catch (e) {
        return errorResponse(`Failed to fetch discussion: ${(e as Error).message}`, 500);
      }
    }

    // Manual board refresh (auth required)
    if (url.pathname === "/board" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization");
      if (authHeader !== `Bearer ${env.API_KEY}`) {
        return errorResponse("Unauthorized", 401);
      }
      try {
        const { content: games } = await getFileFromGitHub(env, env.GITHUB_TOKEN);
        await updateCompatBoard(env, games);
        return jsonResponse({ ok: true, games: games.length });
      } catch (e) {
        return errorResponse(`Board update failed: ${(e as Error).message}`, 500);
      }
    }

    return errorResponse("Not found", 404);
  },
};
