import compatData from "../../data/compatibility.json";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type GameStatus = "playable" | "ingame" | "intro" | "loads" | "nothing";

export type PerfTier = "great" | "ok" | "poor";

export interface GameReport {
  device: string;
  ios: string;
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
  lastReport: { device: string; ios: string };
  updatedAt: string;
  notes: string;
  recommendedSettings: { resolution: string; framerate: string };
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

/* ------------------------------------------------------------------ */
/*  Data accessors                                                     */
/* ------------------------------------------------------------------ */

export function getAllGames(): Game[] {
  return compatData as Game[];
}

export function getGameBySlug(slug: string): Game | undefined {
  return (compatData as Game[]).find((game) => game.slug === slug);
}
