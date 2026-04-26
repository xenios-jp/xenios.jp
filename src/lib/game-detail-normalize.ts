/**
 * Comparable / discussion field normalizers used by game-detail.ts when
 * matching reports against discussion entries. Each helper returns the
 * lowest-common-denominator form of a value so two records can be diffed
 * without false negatives from whitespace, casing, or formatting.
 */

import {
  deviceName,
  type PerfTier,
  type Platform,
  type SummaryStatus,
} from "@/lib/compatibility";

export function normalizeComparableText(value?: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeComparableDevice(value?: string | null): string {
  return deviceName(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function normalizeComparableOsVersion(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/\b(ios|ipados|macos|os x)\b/g, "")
    .replace(/[^0-9.]+/g, "");
}

export function normalizeDiscussionPlatform(value?: string | null): Platform | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "ios") return "ios";
  if (normalized === "macos") return "macos";
  return null;
}

export function normalizeDiscussionStatus(value?: string | null): SummaryStatus | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (
    normalized === "playable" ||
    normalized === "ingame" ||
    normalized === "intro" ||
    normalized === "loads" ||
    normalized === "nothing" ||
    normalized === "untested"
  ) {
    return normalized;
  }
  return null;
}

export function normalizeDiscussionPerf(value?: string | null): PerfTier | null {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "great" ||
    normalized === "ok" ||
    normalized === "poor" ||
    normalized === "n/a"
  ) {
    return normalized;
  }
  return null;
}
