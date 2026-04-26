/**
 * Comparators used to sort reports, observations, and activity items in
 * game-detail.ts. Pulled out so the comparator layer can be unit-tested
 * in isolation and so the parent file stops hitting four-figure line
 * counts.
 */

import type { GameReport, PerfTier, SummaryStatus } from "@/lib/compatibility";
import { STATUS_RANK, SUMMARY_STATUS_RANK } from "@/lib/compat-status";

export interface CompatibilityObservation {
  status: SummaryStatus;
  perf: PerfTier;
  date: string;
  device: string | null;
}

export interface DateBearingActivity {
  id: string;
  dateMs: number;
}

export function parseDateValue(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function compareReportsByDate(left: GameReport, right: GameReport): number {
  const byDate = parseDateValue(right.date) - parseDateValue(left.date);
  if (byDate !== 0) return byDate;
  return STATUS_RANK[right.status] - STATUS_RANK[left.status];
}

export function compareReportsByStatus(
  left: GameReport,
  right: GameReport,
  direction: "best" | "worst",
): number {
  const rankDelta = STATUS_RANK[left.status] - STATUS_RANK[right.status];
  if (rankDelta !== 0) {
    return direction === "best" ? -rankDelta : rankDelta;
  }
  return compareReportsByDate(left, right);
}

export function compareActivityByDate(
  left: DateBearingActivity,
  right: DateBearingActivity,
): number {
  const byDate = right.dateMs - left.dateMs;
  if (byDate !== 0) return byDate;
  return left.id.localeCompare(right.id);
}

export function compareObservationsByDate(
  left: CompatibilityObservation,
  right: CompatibilityObservation,
): number {
  const byDate = parseDateValue(right.date) - parseDateValue(left.date);
  if (byDate !== 0) return byDate;
  return SUMMARY_STATUS_RANK[right.status] - SUMMARY_STATUS_RANK[left.status];
}
