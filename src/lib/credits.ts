import creditsSnapshot from "../../data/credits.json";

export interface ContributorProfile {
  id: string;
  displayName: string;
  profileUrl: string;
  avatarUrl?: string;
  projects: string[];
}

export interface CreditsPayload {
  generatedAt: string;
  contributors: ContributorProfile[];
  totalProjects: number;
  errors: string[];
}

export function getXeniaContributors(): CreditsPayload {
  return creditsSnapshot as CreditsPayload;
}
