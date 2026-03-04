import compatData from "../../data/compatibility.json";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type GameStatus = "playable" | "ingame" | "intro" | "loads" | "nothing";

export type PerfTier = "great" | "ok" | "poor" | "n/a";

export type Platform = "ios" | "macos";

export type Architecture = "arm64" | "x86_64";

export type GpuBackend = "msc" | "msl";

export interface GameReport {
  device: string;
  platform: Platform;
  osVersion: string;
  arch: Architecture;
  gpuBackend: GpuBackend;
  status: GameStatus;
  date: string;
  notes: string;
}

export interface Game {
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

/* ------------------------------------------------------------------ */
/*  Status & perf tier metadata                                        */
/* ------------------------------------------------------------------ */

export interface StatusOption {
  value: GameStatus;
  label: string;
  description: string;
}

export interface PerfTierOption {
  value: PerfTier;
  label: string;
  description: string;
}

export interface PlatformOption {
  value: Platform;
  label: string;
  description: string;
}

export function getStatuses(): StatusOption[] {
  return [
    {
      value: "playable",
      label: "Playable",
      description: "Game can be played from start to finish with minor issues.",
    },
    {
      value: "ingame",
      label: "In-Game",
      description: "Reaches gameplay but has significant issues preventing completion.",
    },
    {
      value: "intro",
      label: "Intro",
      description: "Gets past loading screens but crashes before or shortly after gameplay.",
    },
    {
      value: "loads",
      label: "Loads",
      description: "Game boots and shows menus but cannot reach gameplay.",
    },
    {
      value: "nothing",
      label: "Nothing",
      description: "Does not boot or crashes immediately.",
    },
  ];
}

export function getPerfTiers(): PerfTierOption[] {
  return [
    {
      value: "great",
      label: "Great",
      description: "Runs at or near full speed with no major issues.",
    },
    {
      value: "ok",
      label: "OK",
      description: "Playable but with noticeable performance drops.",
    },
    {
      value: "poor",
      label: "Poor",
      description: "Significant performance issues; may be unplayable.",
    },
  ];
}

export function getPlatforms(): PlatformOption[] {
  return [
    {
      value: "ios",
      label: "iOS",
      description: "iPhone and iPad running iOS/iPadOS.",
    },
    {
      value: "macos",
      label: "macOS",
      description: "Mac running macOS (ARM64 or x86_64).",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Data accessors                                                     */
/* ------------------------------------------------------------------ */

export function getAllGames(): Game[] {
  return compatData as Game[];
}

export function getGameBySlug(slug: string): Game | undefined {
  return (compatData as Game[]).find((game) => game.slug === slug);
}

/* ------------------------------------------------------------------ */
/*  Device name mapping                                                */
/* ------------------------------------------------------------------ */

const DEVICE_NAMES: Record<string, string> = {
  // iPhone 17 series
  "iPhone18,1": "iPhone 17 Pro",
  "iPhone18,2": "iPhone 17 Pro Max",
  "iPhone18,3": "iPhone 17",
  "iPhone18,4": "iPhone 17 Air",
  // iPhone 16 series
  "iPhone17,1": "iPhone 16 Pro",
  "iPhone17,2": "iPhone 16 Pro Max",
  "iPhone17,3": "iPhone 16",
  "iPhone17,4": "iPhone 16 Plus",
  "iPhone17,5": "iPhone 16e",
  // iPhone 15 series
  "iPhone16,1": "iPhone 15 Pro",
  "iPhone16,2": "iPhone 15 Pro Max",
  "iPhone15,4": "iPhone 15",
  "iPhone15,5": "iPhone 15 Plus",
  // iPhone 14 series
  "iPhone15,2": "iPhone 14 Pro",
  "iPhone15,3": "iPhone 14 Pro Max",
  "iPhone14,7": "iPhone 14",
  "iPhone14,8": "iPhone 14 Plus",
  // iPhone 13 series
  "iPhone14,2": "iPhone 13 Pro",
  "iPhone14,3": "iPhone 13 Pro Max",
  "iPhone14,4": "iPhone 13 Mini",
  "iPhone14,5": "iPhone 13",
  // iPhone 12 series
  "iPhone13,1": "iPhone 12 Mini",
  "iPhone13,2": "iPhone 12",
  "iPhone13,3": "iPhone 12 Pro",
  "iPhone13,4": "iPhone 12 Pro Max",
  // iPhone SE
  "iPhone14,6": "iPhone SE (3rd gen)",
  "iPhone12,8": "iPhone SE (2nd gen)",
  // iPad Pro
  "iPad16,3": "iPad Pro (M4)",
  "iPad16,4": "iPad Pro (M4)",
  "iPad16,5": "iPad Pro (M4)",
  "iPad16,6": "iPad Pro (M4)",
  "iPad14,3": "iPad Pro (M2)",
  "iPad14,4": "iPad Pro (M2)",
  "iPad14,5": "iPad Pro (M2)",
  "iPad14,6": "iPad Pro (M2)",
  "iPad13,4": "iPad Pro (M1)",
  "iPad13,5": "iPad Pro (M1)",
  "iPad13,6": "iPad Pro (M1)",
  "iPad13,7": "iPad Pro (M1)",
  "iPad13,8": "iPad Pro (M1)",
  "iPad13,9": "iPad Pro (M1)",
  "iPad13,10": "iPad Pro (M1)",
  "iPad13,11": "iPad Pro (M1)",
  // iPad Air
  "iPad15,3": "iPad Air (M3)",
  "iPad15,4": "iPad Air (M3)",
  "iPad15,5": "iPad Air (M3)",
  "iPad15,6": "iPad Air (M3)",
  "iPad14,8": "iPad Air (M2)",
  "iPad14,9": "iPad Air (M2)",
  "iPad14,10": "iPad Air (M2)",
  "iPad14,11": "iPad Air (M2)",
  "iPad13,16": "iPad Air (M1)",
  "iPad13,17": "iPad Air (M1)",
  // iPad mini
  "iPad16,1": "iPad mini (A17 Pro)",
  "iPad16,2": "iPad mini (A17 Pro)",
  "iPad14,1": "iPad mini (6th gen)",
  "iPad14,2": "iPad mini (6th gen)",
  // iPad
  "iPad15,7": "iPad (11th gen)",
  "iPad15,8": "iPad (11th gen)",
  "iPad13,18": "iPad (10th gen)",
  "iPad13,19": "iPad (10th gen)",
  "iPad12,1": "iPad (9th gen)",
  "iPad12,2": "iPad (9th gen)",
};

export function deviceName(raw: string): string {
  return DEVICE_NAMES[raw] || raw;
}

const STATUS_RANK: Record<GameStatus, number> = {
  playable: 4,
  ingame: 3,
  intro: 2,
  loads: 1,
  nothing: 0,
};

export function getBestReport(game: Game): GameReport | null {
  if (game.reports.length === 0) return null;
  return game.reports.reduce((best, report) => {
    const bestRank = STATUS_RANK[best.status];
    const reportRank = STATUS_RANK[report.status];
    if (reportRank > bestRank) return report;
    if (reportRank === bestRank && report.date > best.date) return report;
    return best;
  });
}
