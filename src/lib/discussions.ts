import discussionSnapshot from "../../data/discussions.json";

export interface ReportMeta {
  status?: string;
  perf?: string;
  device?: string;
  platform?: string;
  osVersion?: string;
  gpuBackend?: string;
  submittedBy?: string;
}

export interface DiscussionEntry {
  id: string;
  type: "issue" | "comment";
  url: string;
  author: string;
  createdAt: string;
  createdAtMs: number;
  issueNumber: number;
  excerpt: string;
  images: string[];
  meta: ReportMeta;
}

export interface DiscussionData {
  titleId: string;
  issueNumber: number;
  issueUrl: string;
  updatedAt: string;
  entries: DiscussionEntry[];
}

interface DiscussionSnapshot {
  generatedAt: string;
  source: {
    owner: string;
    repo: string;
    label: string;
    state: string;
  };
  discussions: Record<string, DiscussionData>;
}

const snapshot = discussionSnapshot as DiscussionSnapshot;

function compareDiscussionEntriesByDate(
  left: DiscussionEntry,
  right: DiscussionEntry,
): number {
  const byDate = right.createdAtMs - left.createdAtMs;
  if (byDate !== 0) return byDate;
  return left.id.localeCompare(right.id);
}

function mergeDiscussionData(discussions: DiscussionData[]): DiscussionData | null {
  if (discussions.length === 0) {
    return null;
  }

  const primary = discussions[0]!;
  const entries = new Map<string, DiscussionEntry>();

  for (const discussion of discussions) {
    for (const entry of discussion.entries) {
      entries.set(entry.id, entry);
    }
  }

  const latestUpdatedAt =
    [...discussions]
      .map((discussion) => discussion.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? primary.updatedAt;

  return {
    titleId: primary.titleId,
    issueNumber: primary.issueNumber,
    issueUrl: primary.issueUrl,
    updatedAt: latestUpdatedAt,
    entries: [...entries.values()].sort(compareDiscussionEntriesByDate),
  };
}

export function getAllDiscussions(): DiscussionData[] {
  return Object.values(snapshot.discussions);
}

export function getDiscussionByTitleId(titleId: string): DiscussionData | null {
  return snapshot.discussions[titleId.toUpperCase()] ?? null;
}

export function getDiscussionByTitleIds(titleIds: string[]): DiscussionData | null {
  const matches: DiscussionData[] = [];

  for (const titleId of titleIds) {
    const discussion = getDiscussionByTitleId(titleId);
    if (discussion) {
      matches.push(discussion);
    }
  }

  return mergeDiscussionData(matches);
}
