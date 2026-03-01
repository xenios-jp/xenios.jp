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
  DISCORD_BOARD_WEBHOOK?: string;   // optional — falls back to DISCORD_WEBHOOK
  DISCORD_BOARD_MESSAGE_ID?: string;
  API_KEY: string;
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
}

type GameStatus = "playable" | "ingame" | "intro" | "loads" | "nothing";
type PerfTier = "great" | "ok" | "poor" | "n/a";
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
  submittedBy?: string;
  source?: ReportSource;
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
  // Use the issues list API (instant) instead of search API (has indexing delays).
  // Filter by compat-report label and check title prefix for the titleId.
  const res = await githubFetch(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?labels=compat-report&state=open&per_page=100`,
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

function buildReportBody(report: ReportPayload, source: ReportSource, screenshotUrl?: string, submittedBy?: string): string {
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
    `| **Device** | ${report.device} |`,
    `| **OS Version** | ${platformDisplay} ${report.osVersion} |`,
    `| **Architecture** | ${report.arch} |`,
    `| **GPU Backend** | ${report.gpuBackend.toUpperCase()} |`,
    ...(submittedBy ? [`| **Submitted By** | ${submittedBy} |`] : []),
    ``,
    `### Notes`,
    report.notes,
  ];

  if (screenshotUrl) {
    lines.push(``, `### Screenshot`, `![screenshot](${screenshotUrl})`);
  }

  lines.push(``, `---`, SOURCE_FOOTERS[source], `<!-- xenios-auto -->`);

  return lines.join("\n");
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

async function createNewIssue(token: string, report: ReportPayload, source: ReportSource, screenshotUrl?: string, submittedBy?: string): Promise<string> {
  const body = buildReportBody(report, source, screenshotUrl, submittedBy);
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

async function addCommentToIssue(token: string, issueNumber: number, report: ReportPayload, source: ReportSource, screenshotUrl?: string, submittedBy?: string): Promise<string> {
  const body = buildReportBody(report, source, screenshotUrl, submittedBy);

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

async function createOrUpdateIssue(token: string, report: ReportPayload, source: ReportSource, screenshotUrl?: string, submittedBy?: string): Promise<string> {
  const existing = await findExistingIssue(token, report.titleId);

  if (existing) {
    const [issueUrl] = await Promise.all([
      addCommentToIssue(token, existing.number, report, source, screenshotUrl, submittedBy),
      updateIssueLabels(token, existing.number, existing.labels, report),
    ]);
    return issueUrl;
  }

  return createNewIssue(token, report, source, screenshotUrl, submittedBy);
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

async function postToDiscord(webhookUrl: string, report: ReportPayload, issueUrl: string, source: ReportSource, screenshotUrl?: string, submittedBy?: string): Promise<void> {
  const desc = [
    `${STATUS_LABELS[report.status]}  \u2022  ${PERF_LABELS[report.perf]}`,
    `${PLATFORM_LABELS[report.platform]}  \u2022  ${report.device}`,
    ``,
    report.notes.slice(0, 300) + (report.notes.length > 300 ? "..." : ""),
  ].join("\n");

  const embed: Record<string, unknown> = {
    title: report.title,
    url: issueUrl || undefined,
    description: desc,
    color: STATUS_COLORS[report.status],
    footer: { text: submittedBy ? `${submittedBy} \u2022 ${SOURCE_LABELS[source]}` : SOURCE_LABELS[source] },
    timestamp: new Date().toISOString(),
  };

  if (screenshotUrl) {
    embed.image = { url: screenshotUrl };
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

const WEBSITE_BASE = "https://xenios.jp";

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

  // Sort games: by status order, then alphabetically
  const sorted = [...games].sort((a, b) => {
    const si = STATUS_ORDER.indexOf(a.status);
    const bi = STATUS_ORDER.indexOf(b.status);
    if (si !== bi) return si - bi;
    return a.title.localeCompare(b.title);
  });

  // Build description grouped by status
  const sections: string[] = [];
  for (const status of STATUS_ORDER) {
    const group = sorted.filter((g) => g.status === status);
    if (group.length === 0) continue;
    const header = `${STATUS_EMOJI[status]} **${STATUS_LABEL_PLAIN[status]}** (${group.length})`;
    const rows = group.map(
      (g) => `[${g.title}](${WEBSITE_BASE}/compatibility/${g.slug}) \u2014 ${g.lastReport.device}`
    );
    sections.push(`${header}\n${rows.join("\n")}`);
  }

  const description = sections.join("\n\n");

  // Discord embed description limit is 4096 chars. If over, truncate.
  const truncated = description.length > 4000
    ? description.slice(0, 4000) + "\n\n*...and more. See full list on the website.*"
    : description;

  const embed = {
    title: "Game Compatibility",
    description: truncated,
    color: 0x34d399,
    footer: { text: `${games.length} games \u2022 xenios.jp/compatibility` },
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

function mergeReport(games: Game[], report: ReportPayload, source?: ReportSource, submittedBy?: string): Game[] {
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
    ...(submittedBy ? { submittedBy } : {}),
    ...(source ? { source } : {}),
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
    reports: [newReport],
    screenshots: [],
  };

  return [...games, newGame];
}

// ── Unified Pipeline ─────────────────────────────────────────────────

async function processReport(env: Env, report: ReportPayload, source: ReportSource, screenshotUrl?: string, submittedBy?: string): Promise<PipelineResult> {
  // 1. Fetch current compatibility.json from GitHub
  const { content: games, sha } = await getFileFromGitHub(env.GITHUB_TOKEN);

  // 2. Merge in the new report
  const updated = mergeReport(games, report, source, submittedBy);

  // 3. Commit back to GitHub
  const platformDisplay = report.platform === "ios" ? "iOS" : "macOS";
  const commitMsg = `compat: ${report.title} \u2014 ${report.status} on ${report.device} (${platformDisplay}) [via ${source}]`;
  await commitToGitHub(env.GITHUB_TOKEN, updated, sha, commitMsg);

  // 4. Create or update GitHub issue (one issue per game)
  let issueUrl = "";
  try {
    issueUrl = await createOrUpdateIssue(env.GITHUB_TOKEN, report, source, screenshotUrl, submittedBy);
  } catch (e) {
    console.error("Issue creation/update failed:", e);
  }

  // 5. Post to Discord
  try {
    await postToDiscord(env.DISCORD_WEBHOOK, report, issueUrl, source, screenshotUrl, submittedBy);
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
    game: report.title,
    status: report.status,
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
      keyData,
      "Ed25519",
      false,
      ["verify"]
    );

    const encoder = new TextEncoder();
    const message = encoder.encode(timestamp + body);
    const sig = hexToUint8Array(signature);

    const valid = await crypto.subtle.verify("Ed25519", key, sig, message);
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

// ── Cache helpers for bridging screenshot URL between command → modal ─

async function storeScreenshotUrl(interactionId: string, url: string): Promise<void> {
  const cache = caches.default;
  const key = `https://xenios-modal.internal/${interactionId}`;
  await cache.put(key, new Response(url, {
    headers: { "Cache-Control": "s-maxage=600" },
  }));
}

async function getScreenshotUrl(interactionId: string): Promise<string> {
  const cache = caches.default;
  const key = `https://xenios-modal.internal/${interactionId}`;
  const response = await cache.match(key);
  if (!response) return "";
  try {
    return await response.text();
  } catch {
    return "";
  }
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

// ── Cache command options between slash command → modal submit ────────

interface CommandOptions {
  status: string;
  perf: string;
  device: string;
  osVersion: string;
  arch: string;
  gpuBackend: string;
  screenshotUrl: string;
  submittedBy: string;
}

async function storeCommandOptions(key: string, data: CommandOptions): Promise<void> {
  const cache = caches.default;
  const url = `https://xenios-modal.internal/cmdopts/${key}`;
  await cache.put(url, new Response(JSON.stringify(data), {
    headers: { "Cache-Control": "s-maxage=600", "Content-Type": "application/json" },
  }));
}

async function getCommandOptions(key: string): Promise<CommandOptions | null> {
  const cache = caches.default;
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
          const { content: games } = await getFileFromGitHub(env.GITHUB_TOKEN);

          if (!query) {
            // No search term: show summary
            const counts: Record<GameStatus, number> = { playable: 0, ingame: 0, intro: 0, loads: 0, nothing: 0 };
            games.forEach((g: Game) => { counts[g.status] += 1; });

            const lines = STATUS_ORDER.map(
              (s) => `${STATUS_EMOJI[s]} **${STATUS_LABEL_PLAIN[s]}**: ${counts[s]}`
            );

            return discordJsonResponse({
              type: RESPONSE_TYPE.CHANNEL_MESSAGE,
              data: {
                embeds: [{
                  title: "Game Compatibility",
                  description: lines.join("\n") + `\n\n**${games.length} games tested**\n[Browse full list](${WEBSITE_BASE}/compatibility)`,
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
                content: `No games found matching "${getOption("game")}". [Browse all](${WEBSITE_BASE}/compatibility)`,
                flags: FLAGS.EPHEMERAL,
              },
            });
          }

          const embeds = matches.map((g: Game) => ({
            title: g.title,
            url: `${WEBSITE_BASE}/compatibility/${g.slug}`,
            description: g.notes.slice(0, 200) + (g.notes.length > 200 ? "..." : ""),
            color: STATUS_COLORS[g.status],
            fields: [
              { name: "Status", value: `${STATUS_EMOJI[g.status]} ${STATUS_LABEL_PLAIN[g.status]}`, inline: true },
              { name: "Device", value: g.lastReport.device, inline: true },
              { name: "Title ID", value: `\`${g.titleId}\``, inline: true },
            ],
            footer: { text: `Updated ${g.updatedAt}` },
          }));

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
        };

        console.log("[discord] modal submitted, payload:", rawPayload.titleId, rawPayload.title);

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
        const screenshotUrl = cmdOpts.screenshotUrl || undefined;
        const submittedBy = cmdOpts.submittedBy || undefined;

        // Respond with deferred message, process in background
        ctx.waitUntil(
          (async () => {
            try {
              const result = await processReport(env, report, "discord", screenshotUrl, submittedBy);

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
      console.log("[fetch] POST /discord hit");
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

    // Manual board refresh (auth required)
    if (url.pathname === "/board" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization");
      if (authHeader !== `Bearer ${env.API_KEY}`) {
        return errorResponse("Unauthorized", 401);
      }
      try {
        const { content: games } = await getFileFromGitHub(env.GITHUB_TOKEN);
        await updateCompatBoard(env, games);
        return jsonResponse({ ok: true, games: games.length });
      } catch (e) {
        return errorResponse(`Board update failed: ${(e as Error).message}`, 500);
      }
    }

    return errorResponse("Not found", 404);
  },
};
