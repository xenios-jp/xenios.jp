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

export function getDiscussionByTitleId(titleId: string): DiscussionData | null {
  return snapshot.discussions[titleId.toUpperCase()] ?? null;
}
