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
 */

// ── Types ────────────────────────────────────────────────────────────

interface Env {
  GITHUB_TOKEN: string;
  DISCORD_WEBHOOK: string;
  API_KEY: string;
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
}

type GameStatus = "playable" | "ingame" | "intro" | "loads" | "nothing";
type PerfTier = "great" | "ok" | "poor";
type Platform = "ios" | "macos";
type Architecture = "arm64" | "x86_64";
type GpuBackend = "msc" | "msl";

type ReportSource = "app" | "discord" | "github";

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
  resolution?: string;
  framerate?: string;
}

interface GameReport {
  device: string;
  platform: Platform;
  osVersion: string;
  arch: Architecture;
  gpuBackend: GpuBackend;
  status: GameStatus;
  date: string;
  notes: string;
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
  recommendedSettings: { resolution: string; framerate: string };
  reports: GameReport[];
  screenshots: string[];
}

interface PipelineResult {
  success: boolean;
  game: string;
  status: GameStatus;
  issueUrl: string;
  error?: string;
}

// ── Config ───────────────────────────────────────────────────────────

const GITHUB_OWNER = "xenios-jp";
const GITHUB_REPO = "xenios.jp";
const COMPAT_PATH = "data/compatibility.json";
const BRANCH = "main";

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
    { value: "nothing" as GameStatus, label: "Nothing", description: "Does not boot or crashes immediately" },
  ],
  perfTiers: [
    { value: "great" as PerfTier, label: "Great", description: "Runs at or near full speed" },
    { value: "ok" as PerfTier, label: "OK", description: "Playable but with noticeable performance drops" },
    { value: "poor" as PerfTier, label: "Poor", description: "Significant performance issues" },
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

// ── Validation ───────────────────────────────────────────────────────

function validatePayload(body: unknown): { ok: true; data: ReportPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;

  if (!b.titleId || typeof b.titleId !== "string") return { ok: false, error: "titleId is required" };
  if (!b.title || typeof b.title !== "string") return { ok: false, error: "title is required" };
  if (!VALID_STATUSES.includes(b.status as GameStatus)) return { ok: false, error: `status must be one of: ${VALID_STATUSES.join(", ")}` };
  if (!VALID_PERFS.includes(b.perf as PerfTier)) return { ok: false, error: `perf must be one of: ${VALID_PERFS.join(", ")}` };
  if (!VALID_PLATFORMS.includes(b.platform as Platform)) return { ok: false, error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` };
  if (!b.device || typeof b.device !== "string") return { ok: false, error: "device is required" };
  if (!b.osVersion || typeof b.osVersion !== "string") return { ok: false, error: "osVersion is required" };
  if (!VALID_ARCHS.includes(b.arch as Architecture)) return { ok: false, error: `arch must be one of: ${VALID_ARCHS.join(", ")}` };
  if (!VALID_GPU_BACKENDS.includes(b.gpuBackend as GpuBackend)) return { ok: false, error: `gpuBackend must be one of: ${VALID_GPU_BACKENDS.join(", ")}` };
  if (!b.notes || typeof b.notes !== "string") return { ok: false, error: "notes is required" };

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
      resolution: typeof b.resolution === "string" ? b.resolution : undefined,
      framerate: typeof b.framerate === "string" ? b.framerate : undefined,
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

async function getFileFromGitHub(token: string): Promise<{ content: Game[]; sha: string }> {
  const res = await githubFetch(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${COMPAT_PATH}?ref=${BRANCH}`, token);

  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status} ${await res.text()}`);

  const json = (await res.json()) as { content: string; sha: string };
  const decoded = atob(json.content.replace(/\n/g, ""));
  return { content: JSON.parse(decoded) as Game[], sha: json.sha };
}

async function commitToGitHub(token: string, games: Game[], sha: string, message: string): Promise<void> {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(games, null, 2) + "\n")));

  const res = await githubFetch(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${COMPAT_PATH}`, token, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: encoded,
      sha,
      branch: BRANCH,
    }),
  });

  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status} ${await res.text()}`);
}

// ── GitHub Issue Management (One Issue Per Game) ─────────────────────

async function findExistingIssue(token: string, titleId: string): Promise<{ number: number; labels: string[] } | null> {
  const query = encodeURIComponent(`${titleId} repo:${GITHUB_OWNER}/${GITHUB_REPO} label:compat-report`);
  const res = await githubFetch(`/search/issues?q=${query}`, token);

  if (!res.ok) {
    console.error(`GitHub search failed: ${res.status} ${await res.text()}`);
    return null;
  }

  const data = (await res.json()) as { items: Array<{ number: number; title: string; labels: Array<{ name: string }> }> };

  const match = data.items.find((issue) => issue.title.startsWith(`${titleId} `));
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

function buildReportBody(report: ReportPayload, source: ReportSource): string {
  const statusEmoji: Record<GameStatus, string> = {
    playable: "\u2705",
    ingame: "\uD83D\uDFE6",
    intro: "\uD83D\uDFE8",
    loads: "\uD83D\uDFE7",
    nothing: "\uD83D\uDD34",
  };

  const platformDisplay = report.platform === "ios" ? "iOS" : "macOS";

  return [
    `## Compatibility Report`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Title** | ${report.title} |`,
    `| **Title ID** | \`${report.titleId}\` |`,
    `| **Status** | ${statusEmoji[report.status]} ${report.status} |`,
    `| **Performance** | ${report.perf} |`,
    `| **Platform** | ${platformDisplay} |`,
    `| **Device** | ${report.device} |`,
    `| **OS Version** | ${platformDisplay} ${report.osVersion} |`,
    `| **Architecture** | ${report.arch} |`,
    `| **GPU Backend** | ${report.gpuBackend.toUpperCase()} |`,
    ``,
    `### Notes`,
    report.notes,
    ``,
    `---`,
    SOURCE_FOOTERS[source],
  ].join("\n");
}

function buildLabels(report: ReportPayload): string[] {
  return [
    "compat-report",
    `state:${report.status}`,
    `perf:${report.perf}`,
    `platform:${report.platform}`,
    `gpu:${report.gpuBackend}`,
  ];
}

async function createNewIssue(token: string, report: ReportPayload, source: ReportSource): Promise<string> {
  const body = buildReportBody(report, source);
  const labels = buildLabels(report);

  const res = await githubFetch(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, token, {
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

async function addCommentToIssue(token: string, issueNumber: number, report: ReportPayload, source: ReportSource): Promise<string> {
  const body = buildReportBody(report, source);

  const res = await githubFetch(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}/comments`, token, {
    method: "POST",
    body: JSON.stringify({ body }),
  });

  if (!res.ok) throw new Error(`GitHub comment creation failed: ${res.status} ${await res.text()}`);

  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}`;
}

async function updateIssueLabels(token: string, issueNumber: number, existingLabels: string[], report: ReportPayload): Promise<void> {
  const kept = existingLabels.filter((l) => !l.startsWith("state:") && !l.startsWith("perf:"));

  const newLabels = new Set(kept);
  newLabels.add("compat-report");
  newLabels.add(`state:${report.status}`);
  newLabels.add(`perf:${report.perf}`);
  newLabels.add(`platform:${report.platform}`);
  newLabels.add(`gpu:${report.gpuBackend}`);

  const res = await githubFetch(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}`, token, {
    method: "PATCH",
    body: JSON.stringify({ labels: [...newLabels] }),
  });

  if (!res.ok) {
    console.error(`GitHub label update failed: ${res.status} ${await res.text()}`);
  }
}

async function createOrUpdateIssue(token: string, report: ReportPayload, source: ReportSource): Promise<string> {
  const existing = await findExistingIssue(token, report.titleId);

  if (existing) {
    const [issueUrl] = await Promise.all([
      addCommentToIssue(token, existing.number, report, source),
      updateIssueLabels(token, existing.number, existing.labels, report),
    ]);
    return issueUrl;
  }

  return createNewIssue(token, report, source);
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

async function postToDiscord(webhookUrl: string, report: ReportPayload, issueUrl: string, source: ReportSource): Promise<void> {
  const platformDisplay = report.platform === "ios" ? "iOS" : "macOS";

  const embed = {
    title: report.title,
    description: report.notes,
    color: STATUS_COLORS[report.status],
    fields: [
      { name: "Status", value: STATUS_LABELS[report.status], inline: true },
      { name: "Performance", value: PERF_LABELS[report.perf], inline: true },
      { name: "Title ID", value: `\`${report.titleId}\``, inline: true },
      { name: "Platform", value: PLATFORM_LABELS[report.platform], inline: true },
      { name: "Device", value: report.device, inline: true },
      { name: "OS Version", value: `${platformDisplay} ${report.osVersion}`, inline: true },
      { name: "Architecture", value: report.arch.toUpperCase(), inline: true },
      { name: "GPU Backend", value: report.gpuBackend.toUpperCase(), inline: true },
      { name: "GitHub Issue", value: issueUrl ? `[View](${issueUrl})` : "N/A", inline: true },
    ],
    footer: { text: `XeniOS Compatibility Report \u2022 via ${SOURCE_LABELS[source]}` },
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    console.error(`Discord webhook failed: ${res.status} ${await res.text()}`);
  }
}

// ── Merge logic ──────────────────────────────────────────────────────

function mergeReport(games: Game[], report: ReportPayload): Game[] {
  const today = todayISO();
  const newReport: GameReport = {
    device: report.device,
    platform: report.platform,
    osVersion: report.osVersion,
    arch: report.arch,
    gpuBackend: report.gpuBackend,
    status: report.status,
    date: today,
    notes: report.notes,
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

    if (!game.platforms.includes(report.platform)) {
      game.platforms = [...game.platforms, report.platform];
    }

    if (report.tags && report.tags.length > 0) {
      const existing = new Set(game.tags);
      report.tags.forEach((t) => existing.add(t));
      game.tags = [...existing];
    }
    if (report.resolution) game.recommendedSettings.resolution = report.resolution;
    if (report.framerate) game.recommendedSettings.framerate = report.framerate;

    const updated = [...games];
    updated[idx] = game;
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
    recommendedSettings: {
      resolution: report.resolution || "720p",
      framerate: report.framerate || "30fps",
    },
    reports: [newReport],
    screenshots: [],
  };

  return [...games, newGame];
}

// ── Unified Pipeline ─────────────────────────────────────────────────

async function processReport(env: Env, report: ReportPayload, source: ReportSource): Promise<PipelineResult> {
  // 1. Fetch current compatibility.json from GitHub
  const { content: games, sha } = await getFileFromGitHub(env.GITHUB_TOKEN);

  // 2. Merge in the new report
  const updated = mergeReport(games, report);

  // 3. Commit back to GitHub
  const platformDisplay = report.platform === "ios" ? "iOS" : "macOS";
  const commitMsg = `compat: ${report.title} \u2014 ${report.status} on ${report.device} (${platformDisplay}) [via ${source}]`;
  await commitToGitHub(env.GITHUB_TOKEN, updated, sha, commitMsg);

  // 4. Create or update GitHub issue (one issue per game)
  let issueUrl = "";
  try {
    issueUrl = await createOrUpdateIssue(env.GITHUB_TOKEN, report, source);
  } catch (e) {
    console.error("Issue creation/update failed:", e);
  }

  // 5. Post to Discord
  try {
    await postToDiscord(env.DISCORD_WEBHOOK, report, issueUrl, source);
  } catch (e) {
    console.error("Discord post failed:", e);
  }

  return {
    success: true,
    game: report.title,
    status: report.status,
    issueUrl,
  };
}

// ── Discord Interactions (Slash Command + Modal) ─────────────────────

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

  if (!signature || !timestamp) {
    return { valid: false, body };
  }

  try {
    const keyData = hexToUint8Array(publicKey);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData.buffer as ArrayBuffer,
      { name: "Ed25519", namedCurve: "Ed25519" },
      false,
      ["verify"]
    );

    const encoder = new TextEncoder();
    const message = encoder.encode(timestamp + body);
    const sig = hexToUint8Array(signature);

    const valid = await crypto.subtle.verify("Ed25519", key, sig.buffer as ArrayBuffer, message);
    return { valid, body };
  } catch (e) {
    console.error("Ed25519 verification error:", e);
    return { valid: false, body };
  }
}

function discordJsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

function buildModal(customId: string): unknown {
  return {
    type: RESPONSE_TYPE.MODAL,
    data: {
      custom_id: customId,
      title: "XeniOS Compatibility Report",
      components: [
        {
          type: 1, // Action Row
          components: [{
            type: 4, // Text Input
            custom_id: "title_id",
            label: "Title ID",
            style: 1, // Short
            placeholder: "e.g., 4D5307E6",
            min_length: 1,
            max_length: 16,
            required: true,
          }],
        },
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: "game_name",
            label: "Game Name",
            style: 1,
            placeholder: "e.g., Halo 3",
            min_length: 1,
            max_length: 100,
            required: true,
          }],
        },
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: "device",
            label: "Device",
            style: 1,
            placeholder: "e.g., iPhone 16 Pro, MacBook Pro M3",
            min_length: 1,
            max_length: 100,
            required: true,
          }],
        },
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: "os_version",
            label: "OS Version",
            style: 1,
            placeholder: "e.g., 18.3 (iOS) or 15.2 (macOS)",
            min_length: 1,
            max_length: 20,
            required: true,
          }],
        },
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: "notes",
            label: "Notes",
            style: 2, // Paragraph
            placeholder: "Describe what works, what doesn't, and any workarounds...",
            min_length: 1,
            max_length: 1000,
            required: true,
          }],
        },
      ],
    },
  };
}

function extractModalValue(components: Array<{ type: number; components: Array<{ custom_id: string; value: string }> }>, fieldId: string): string {
  for (const row of components) {
    for (const comp of row.components) {
      if (comp.custom_id === fieldId) return comp.value;
    }
  }
  return "";
}

async function handleDiscordInteraction(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  // Verify Ed25519 signature
  const { valid, body } = await verifyDiscordSignature(request, env.DISCORD_PUBLIC_KEY);
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const interaction = JSON.parse(body);

  // Handle PING (Discord verification)
  if (interaction.type === INTERACTION_TYPE.PING) {
    return discordJsonResponse({ type: RESPONSE_TYPE.PONG });
  }

  // Handle slash command: /report
  if (interaction.type === INTERACTION_TYPE.APPLICATION_COMMAND) {
    const options = interaction.data.options || [];

    // Extract dropdown values from slash command options
    const getOption = (name: string): string => {
      const opt = options.find((o: { name: string; value: string }) => o.name === name);
      return opt ? opt.value : "";
    };

    const platform = getOption("platform");
    const status = getOption("status");
    const perf = getOption("perf");
    const arch = getOption("arch");
    const gpu = getOption("gpu");

    // Encode enum values into modal custom_id (fits within 100-char limit)
    // Format: compat:<platform>:<status>:<perf>:<arch>:<gpu>
    const customId = `compat:${platform}:${status}:${perf}:${arch}:${gpu}`;

    return discordJsonResponse(buildModal(customId));
  }

  // Handle modal submission
  if (interaction.type === INTERACTION_TYPE.MODAL_SUBMIT) {
    const customId = interaction.data.custom_id as string;
    const components = interaction.data.components;

    // Decode enum values from custom_id
    const parts = customId.split(":");
    if (parts.length !== 6 || parts[0] !== "compat") {
      return discordJsonResponse({
        type: RESPONSE_TYPE.CHANNEL_MESSAGE,
        data: {
          content: "\u274C Invalid submission. Please use the `/report` command again.",
          flags: FLAGS.EPHEMERAL,
        },
      });
    }

    const [, platform, status, perf, arch, gpu] = parts;

    // Extract text fields from modal
    const titleId = extractModalValue(components, "title_id");
    const gameName = extractModalValue(components, "game_name");
    const device = extractModalValue(components, "device");
    const osVersion = extractModalValue(components, "os_version");
    const notes = extractModalValue(components, "notes");

    // Build and validate the payload
    const rawPayload = {
      titleId,
      title: gameName,
      status,
      perf,
      platform,
      device,
      osVersion,
      arch,
      gpuBackend: gpu,
      notes,
    };

    const validation = validatePayload(rawPayload);
    if (!validation.ok) {
      return discordJsonResponse({
        type: RESPONSE_TYPE.CHANNEL_MESSAGE,
        data: {
          content: `\u274C Validation error: ${validation.error}`,
          flags: FLAGS.EPHEMERAL,
        },
      });
    }

    const report = validation.data;

    // Respond immediately with deferred message (ephemeral), process in background
    ctx.waitUntil(
      (async () => {
        try {
          const result = await processReport(env, report, "discord");

          // PATCH the follow-up message with the result
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

  return new Response("Unknown interaction type", { status: 400 });
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
      if (!validation.ok) {
        return errorResponse(validation.error);
      }

      const report = validation.data;

      try {
        const result = await processReport(env, report, "app");
        return jsonResponse(result);
      } catch (e) {
        console.error("Report processing failed:", e);
        return errorResponse(`Failed to process report: ${(e as Error).message}`, 500);
      }
    }

    // POST /discord — Discord interactions (Ed25519 verified)
    if (url.pathname === "/discord" && request.method === "POST") {
      return handleDiscordInteraction(request, env, ctx);
    }

    // GET /games — public read-only endpoint for the app
    if (url.pathname === "/games" && request.method === "GET") {
      try {
        const { content: games } = await getFileFromGitHub(env.GITHUB_TOKEN);
        return jsonResponse(games);
      } catch (e) {
        return errorResponse(`Failed to fetch games: ${(e as Error).message}`, 500);
      }
    }

    return errorResponse("Not found", 404);
  },
};
