/**
 * Status ordering for compatibility reports.
 *
 * Higher rank = better. The five-level GameStatus ladder is shared between
 * normalization, sorting, and rollup logic; SummaryStatus extends it with
 * `untested` (-1) so we can distinguish "no reports yet" from a confirmed
 * "nothing" outcome when comparing summaries.
 */

import type { GameStatus, SummaryStatus } from "@/lib/compatibility";

export const STATUS_RANK: Record<GameStatus, number> = {
  playable: 4,
  ingame: 3,
  intro: 2,
  loads: 1,
  nothing: 0,
};

export const SUMMARY_STATUS_RANK: Record<SummaryStatus, number> = {
  playable: 4,
  ingame: 3,
  intro: 2,
  loads: 1,
  nothing: 0,
  untested: -1,
};
