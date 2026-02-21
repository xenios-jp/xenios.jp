import { XENIA_REPOS_FOR_CREDITS } from "@/lib/constants";

interface RawGitHubContributor {
  login?: string | null;
  id: number;
  avatar_url?: string;
  html_url?: string;
  name?: string | null;
  contributions: number;
}

export interface ContributorProfile {
  id: string;
  displayName: string;
  profileUrl: string;
  avatarUrl?: string;
  projects: string[];
}

export interface CreditsPayload {
  contributors: ContributorProfile[];
  totalProjects: number;
  errors: string[];
}

interface RepoContributorSnapshot {
  key: string;
  displayName: string;
  profileUrl: string;
  avatarUrl?: string;
  projects: string[];
}

async function fetchContributorsPage(
  owner: string,
  repo: string,
  page: number
): Promise<{ contributors: RawGitHubContributor[]; nextPage?: number }> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "xenios-website",
  };
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100&page=${page}&anon=1`;
  const res = await fetch(url, {
    headers,
    next: { revalidate: 12 * 60 * 60 },
    cache: "force-cache",
  });

  if (!res.ok) {
    throw new Error(`GitHub API error for ${repo}: ${res.status} ${res.statusText}`);
  }

  const contributors = (await res.json()) as RawGitHubContributor[];
  const link = res.headers.get("link");
  const nextMatch = link ? link.match(/<([^>]+)>;\s*rel="next"/) : null;
  const nextPage = nextMatch
    ? Number(new URL(nextMatch[1]).searchParams.get("page"))
    : undefined;

  return { contributors, nextPage };
}

async function fetchAllContributors(
  owner: string,
  repo: string,
): Promise<RawGitHubContributor[]> {
  const all: RawGitHubContributor[] = [];
  let page = 1;

  while (page) {
    const { contributors, nextPage } = await fetchContributorsPage(
      owner,
      repo,
      page
    );
    all.push(...contributors);
    page = nextPage ?? 0;
  }

  return all;
}

function contributorKey(entry: RawGitHubContributor): string {
  if (entry.login) return `user:${entry.login.toLowerCase()}`;
  return `anon:${entry.id}`;
}

export async function getXeniaContributors(): Promise<CreditsPayload> {
  const contributorSnapshotMap = new Map<string, RepoContributorSnapshot>();
  const errors: string[] = [];

  const responses = await Promise.allSettled(
    XENIA_REPOS_FOR_CREDITS.map(async ({ owner, slug, label, filterMode }) => {
      const records = await fetchAllContributors(owner, slug);
      const filteredRecords = records.filter((record) => {
        if (filterMode !== "owner-only") return true;
        return record.login?.toLowerCase() === owner.toLowerCase();
      });

      return { label, owner, records: filteredRecords };
    })
  );

  responses.forEach((response, index) => {
    const label = XENIA_REPOS_FOR_CREDITS[index].label;
    if (response.status === "rejected") {
      errors.push(
        `Failed to load contributors for ${label}: ${
          response.reason instanceof Error
            ? response.reason.message
            : "Unknown error"
        }`
      );
      return;
    }

    const { records } = response.value;

    for (const record of records) {
      const key = contributorKey(record);
      const profileUrl =
        record.html_url ??
        (record.login ? `https://github.com/${record.login}` : "#");

      const existing = contributorSnapshotMap.get(key);
      if (!existing) {
        contributorSnapshotMap.set(key, {
          key,
          displayName: record.login ?? record.name ?? `Contributor ${record.id}`,
          profileUrl,
          avatarUrl: record.avatar_url,
          projects: [label],
        });
        continue;
      }

      if (!existing.projects.includes(label)) {
        existing.projects.push(label);
      }
      if (!existing.avatarUrl && record.avatar_url) {
        existing.avatarUrl = record.avatar_url;
      }
    }
  });

  const contributors = Array.from(contributorSnapshotMap.values()).map(
    (entry): ContributorProfile => ({
      id: entry.key,
      displayName: entry.displayName,
      profileUrl: entry.profileUrl,
      avatarUrl: entry.avatarUrl,
      projects: [...entry.projects].sort((a, b) => a.localeCompare(b)),
    })
  );

  contributors.sort((a, b) => {
    const byProjectCount = b.projects.length - a.projects.length;
    if (byProjectCount !== 0) return byProjectCount;
    return a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: "base",
    });
  });

  return {
    contributors,
    totalProjects: XENIA_REPOS_FOR_CREDITS.length,
    errors,
  };
}
