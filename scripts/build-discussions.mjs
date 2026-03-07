import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const COMPAT_PATH = path.join(repoRoot, "data", "compatibility.json");
const DISCUSSIONS_PATH = path.join(repoRoot, "data", "discussions.json");

const DEFAULT_OWNER = "xenios-jp";
const DEFAULT_REPO = "xenios.jp";
const DISCUSSION_LABEL = "compat-report";
const MAX_DISCUSSION_ENTRIES = 6;

const owner = process.env.GITHUB_OWNER || process.env.GITHUB_REPOSITORY_OWNER || DEFAULT_OWNER;
const repo =
  process.env.GITHUB_REPO ||
  process.env.GITHUB_REPOSITORY?.split("/")[1] ||
  DEFAULT_REPO;
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "xenios-discussion-builder",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function githubFetch(url) {
  const response = await fetch(url, { headers: githubHeaders() });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${body}`);
  }
  return response;
}

async function listIssues() {
  const issues = [];
  let page = 1;

  while (true) {
    const url =
      `https://api.github.com/repos/${owner}/${repo}/issues` +
      `?labels=${encodeURIComponent(DISCUSSION_LABEL)}` +
      `&state=open&per_page=100&page=${page}`;
    const response = await githubFetch(url);
    const pageItems = await response.json();
    const realIssues = pageItems.filter((item) => !item.pull_request);
    issues.push(...realIssues);
    if (pageItems.length < 100) {
      break;
    }
    page += 1;
  }

  return issues;
}

async function listComments(issueNumber) {
  const comments = [];
  let page = 1;

  while (true) {
    const url =
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments` +
      `?per_page=100&page=${page}`;
    const response = await githubFetch(url);
    const pageItems = await response.json();
    comments.push(...pageItems);
    if (pageItems.length < 100) {
      break;
    }
    page += 1;
  }

  return comments;
}

function parseIssueTitle(title) {
  const match = title.match(/^\[?([A-Fa-f0-9]{8})\]?\s*[—–-]\s*(.+?)$/);
  if (!match) {
    return null;
  }
  return {
    titleId: match[1].toUpperCase(),
    title: match[2].trim(),
  };
}

function formatIsoDate(dateString) {
  const timestamp = new Date(dateString);
  if (Number.isNaN(timestamp.getTime())) {
    return dateString;
  }
  return timestamp.toISOString().slice(0, 10);
}

function getTimestamp(dateString) {
  const timestamp = new Date(dateString).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function extractImageUrls(markdown) {
  const imageUrls = new Set();
  const markdownImageRegex = /!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/g;
  const directImageRegex = /(https?:\/\/\S+\.(?:png|jpe?g|gif|webp))/gi;

  let match;
  while ((match = markdownImageRegex.exec(markdown)) !== null) {
    imageUrls.add(match[1]);
  }
  while ((match = directImageRegex.exec(markdown)) !== null) {
    imageUrls.add(match[1]);
  }

  return [...imageUrls];
}

function extractReportMeta(markdown) {
  const meta = {};
  const fieldMap = [
    ["Status", "status"],
    ["Performance", "perf"],
    ["Device", "device"],
    ["Platform", "platform"],
    ["OS Version", "osVersion"],
    ["GPU Backend", "gpuBackend"],
    ["Submitted By", "submittedBy"],
  ];

  for (const [label, key] of fieldMap) {
    const regex = new RegExp(`\\|\\s*\\*\\*${label}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`);
    const match = markdown.match(regex);
    if (match) {
      meta[key] = match[1]
        .replace(
          /^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}✅🔴🟡🟢🟠🟤🟣🔵🟦🟧🟨]\s*/u,
          ""
        )
        .trim();
    }
  }

  return meta;
}

function normalizeExcerpt(markdown) {
  const notesMatch = markdown.match(/###\s*Notes\s*([\s\S]*?)(?:\n###\s|\n---|$)/i);
  const source = notesMatch?.[1] ?? markdown;
  return source
    .replace(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/g, "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\|/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dedupeImageUrls(urls) {
  const bestByPath = new Map();

  for (const url of urls) {
    try {
      const parsed = new URL(url);
      const key = `${parsed.origin}${parsed.pathname}`;
      const existing = bestByPath.get(key);
      if (!existing || url.length > existing.length) {
        bestByPath.set(key, url);
      }
    } catch {
      if (!bestByPath.has(url)) {
        bestByPath.set(url, url);
      }
    }
  }

  return [...bestByPath.values()];
}

function buildIssueEntry(issue) {
  return {
    id: `issue-${issue.number}`,
    type: "issue",
    url: issue.html_url,
    author: issue.user?.login ?? "unknown",
    createdAt: formatIsoDate(issue.created_at),
    createdAtMs: getTimestamp(issue.created_at),
    issueNumber: issue.number,
    excerpt: normalizeExcerpt(issue.body ?? ""),
    images: dedupeImageUrls(extractImageUrls(issue.body ?? "")),
    meta: extractReportMeta(issue.body ?? ""),
  };
}

function buildCommentEntry(issueNumber, comment) {
  return {
    id: `comment-${comment.id}`,
    type: "comment",
    url: comment.html_url,
    author: comment.user?.login ?? "unknown",
    createdAt: formatIsoDate(comment.created_at),
    createdAtMs: getTimestamp(comment.created_at),
    issueNumber,
    excerpt: normalizeExcerpt(comment.body ?? ""),
    images: dedupeImageUrls(extractImageUrls(comment.body ?? "")),
    meta: extractReportMeta(comment.body ?? ""),
  };
}

function sortIssuesByPriority(left, right) {
  if (left.state === "open" && right.state !== "open") {
    return -1;
  }
  if (right.state === "open" && left.state !== "open") {
    return 1;
  }
  return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
}

function filterVisibleEntries(entries) {
  return entries.filter((entry) => entry.excerpt.length > 0 || entry.images.length > 0);
}

function buildDiscussionRecord(titleId, issues, commentsByIssueNumber) {
  const sortedIssues = [...issues].sort(sortIssuesByPriority);
  const canonicalIssue = sortedIssues[0];
  if (!canonicalIssue) {
    return null;
  }

  const issueEntries = sortedIssues.slice(0, 5).map(buildIssueEntry);
  const commentEntries = sortedIssues.flatMap((issue) => {
    const comments = commentsByIssueNumber.get(issue.number) ?? [];
    return comments
      .filter((comment) => comment.user?.login !== "github-actions[bot]")
      .map((comment) => buildCommentEntry(issue.number, comment));
  });

  const entries = filterVisibleEntries([...issueEntries, ...commentEntries])
    .sort((left, right) => {
      if (left.createdAtMs === right.createdAtMs) {
        return left.id < right.id ? 1 : -1;
      }
      return right.createdAtMs - left.createdAtMs;
    })
    .slice(0, MAX_DISCUSSION_ENTRIES);

  return {
    titleId,
    issueNumber: canonicalIssue.number,
    issueUrl: canonicalIssue.html_url,
    updatedAt: formatIsoDate(canonicalIssue.updated_at),
    entries,
  };
}

function enrichCompatibilityData(games, discussionsByTitleId) {
  return games.map((game) => {
    const titleId = typeof game.titleId === "string" ? game.titleId.toUpperCase() : "";
    const discussion = discussionsByTitleId[titleId];
    const nextGame = { ...game };

    if (discussion) {
      nextGame.issueNumber = discussion.issueNumber;
      nextGame.issueUrl = discussion.issueUrl;
    } else {
      delete nextGame.issueNumber;
      delete nextGame.issueUrl;
    }

    return nextGame;
  });
}

async function writeJson(filePath, payload) {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  const compatibility = JSON.parse(await fs.readFile(COMPAT_PATH, "utf8"));
  const issues = await listIssues();
  const groupedIssues = new Map();

  for (const issue of issues) {
    const parsedTitle = parseIssueTitle(issue.title ?? "");
    if (!parsedTitle) {
      continue;
    }

    if (!groupedIssues.has(parsedTitle.titleId)) {
      groupedIssues.set(parsedTitle.titleId, []);
    }
    groupedIssues.get(parsedTitle.titleId).push(issue);
  }

  const commentsByIssueNumber = new Map();
  for (const issue of issues) {
    commentsByIssueNumber.set(issue.number, await listComments(issue.number));
  }

  const discussions = {};
  for (const [titleId, titleIssues] of groupedIssues.entries()) {
    const discussion = buildDiscussionRecord(titleId, titleIssues, commentsByIssueNumber);
    if (discussion) {
      discussions[titleId] = discussion;
    }
  }

  const enrichedCompatibility = enrichCompatibilityData(compatibility, discussions);
  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: {
      owner,
      repo,
      label: DISCUSSION_LABEL,
      state: "open",
    },
    discussions,
  };

  await writeJson(COMPAT_PATH, enrichedCompatibility);
  await writeJson(DISCUSSIONS_PATH, snapshot);

  console.log(
    `Wrote ${Object.keys(discussions).length} discussions and enriched ${enrichedCompatibility.length} games`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
