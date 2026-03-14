import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const OUTPUT_PATH = path.join(repoRoot, "data", "credits.json");
const repos = [
  {
    owner: "xenia-project",
    slug: "xenia",
    label: "xenia (master)",
    url: "https://github.com/xenia-project/xenia",
  },
  {
    owner: "xenia-canary",
    slug: "xenia-canary",
    label: "xenia-canary",
    url: "https://github.com/xenia-canary/xenia-canary",
  },
  {
    owner: "has207",
    slug: "xenia-edge",
    label: "xenia-edge",
    url: "https://github.com/has207/xenia-edge",
  },
  {
    owner: "wmarti",
    slug: "xenia-mac",
    label: "xenia-mac",
    url: "https://github.com/wmarti/xenia-mac",
    filterMode: "owner-only",
  },
];

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

function headers() {
  const nextHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "xenios-credits-builder",
  };
  if (token) {
    nextHeaders.Authorization = `Bearer ${token}`;
  }
  return nextHeaders;
}

async function fetchContributorsPage(owner, repo, page) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100&page=${page}&anon=1`;
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) {
    throw new Error(`GitHub API error for ${owner}/${repo}: ${response.status} ${response.statusText}`);
  }

  const contributors = await response.json();
  const link = response.headers.get("link");
  const nextMatch = link ? link.match(/<([^>]+)>;\s*rel="next"/) : null;
  const nextPage = nextMatch
    ? Number(new URL(nextMatch[1]).searchParams.get("page"))
    : undefined;

  return { contributors, nextPage };
}

async function fetchAllContributors(owner, repo) {
  const all = [];
  let page = 1;

  while (page) {
    const { contributors, nextPage } = await fetchContributorsPage(owner, repo, page);
    all.push(...contributors);
    page = nextPage ?? 0;
  }

  return all;
}

function contributorKey(entry) {
  if (entry.login) {
    return `user:${entry.login.toLowerCase()}`;
  }
  return `anon:${entry.id}`;
}

async function buildSnapshot() {
  const contributorSnapshotMap = new Map();
  const errors = [];
  let successfulRepos = 0;

  for (const repo of repos) {
    try {
      const records = await fetchAllContributors(repo.owner, repo.slug);
      const filteredRecords = records.filter((record) => {
        if (repo.filterMode !== "owner-only") {
          return true;
        }
        return record.login?.toLowerCase() === repo.owner.toLowerCase();
      });

      successfulRepos += 1;
      for (const record of filteredRecords) {
        const key = contributorKey(record);
        const profileUrl =
          record.html_url ??
          (record.login ? `https://github.com/${record.login}` : "#");

        const existing = contributorSnapshotMap.get(key);
        if (!existing) {
          contributorSnapshotMap.set(key, {
            id: key,
            displayName: record.login ?? record.name ?? `Contributor ${record.id}`,
            profileUrl,
            avatarUrl: record.avatar_url,
            projects: [repo.label],
          });
          continue;
        }

        if (!existing.projects.includes(repo.label)) {
          existing.projects.push(repo.label);
        }
        if (!existing.avatarUrl && record.avatar_url) {
          existing.avatarUrl = record.avatar_url;
        }
      }
    } catch (error) {
      errors.push(
        `Failed to load contributors for ${repo.label}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  const contributors = Array.from(contributorSnapshotMap.values()).map((entry) => ({
    ...entry,
    projects: [...entry.projects].sort((left, right) => left.localeCompare(right)),
  }));

  contributors.sort((left, right) => {
    const byProjectCount = right.projects.length - left.projects.length;
    if (byProjectCount !== 0) {
      return byProjectCount;
    }
    return left.displayName.localeCompare(right.displayName, undefined, {
      sensitivity: "base",
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    totalProjects: repos.length,
    successfulRepos,
    contributors,
    errors,
  };
}

async function main() {
  let previousSnapshot = null;
  try {
    previousSnapshot = JSON.parse(await fs.readFile(OUTPUT_PATH, "utf8"));
  } catch {}

  const snapshot = await buildSnapshot();
  if (
    snapshot.successfulRepos === 0 &&
    previousSnapshot &&
    Array.isArray(previousSnapshot.contributors) &&
    previousSnapshot.contributors.length > 0
  ) {
    console.log("All credits fetches failed; keeping the existing snapshot.");
    if (snapshot.errors.length > 0) {
      console.log(snapshot.errors.join("\n"));
    }
    return;
  }

  const persistedSnapshot = {
    generatedAt: snapshot.generatedAt,
    totalProjects: snapshot.totalProjects,
    contributors: snapshot.contributors,
    errors: snapshot.errors,
  };
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(persistedSnapshot, null, 2)}\n`, "utf8");
  console.log(
    `Wrote credits snapshot with ${persistedSnapshot.contributors.length} contributors across ${persistedSnapshot.totalProjects} repos`
  );
  if (persistedSnapshot.errors.length > 0) {
    console.log(persistedSnapshot.errors.join("\n"));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
