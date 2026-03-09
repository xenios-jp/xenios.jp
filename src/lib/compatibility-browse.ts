import type { PerfTier, Platform, SummaryStatus } from "@/lib/compatibility";

export type SortKey = "updated" | "alpha";
export type PlatformFilter = "all" | Platform;
export type CompatibilityBrowseScope = "tested" | "all";
export type AlphaBucket =
  | "all"
  | "0-9"
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z"
  | "#";

export type CatalogBucket = Exclude<AlphaBucket, "all">;
export type CatalogBucketSlug = Exclude<CatalogBucket, "#"> | "other";

export interface CompatibilityBrowseFilters {
  scope: CompatibilityBrowseScope;
  platform: PlatformFilter;
  q: string;
  status: SummaryStatus | null;
  perf: PerfTier | "all";
  device: string;
  sort: SortKey;
  bucket: AlphaBucket;
  page: number;
}

export const ALPHA_BUCKETS: AlphaBucket[] = [
  "all",
  "0-9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "#",
];

export const CATALOG_BUCKETS: CatalogBucket[] = ALPHA_BUCKETS.filter(
  (bucket): bucket is CatalogBucket => bucket !== "all",
);

export const DEFAULT_COMPATIBILITY_BROWSE_FILTERS: CompatibilityBrowseFilters = {
  scope: "tested",
  platform: "all",
  q: "",
  status: null,
  perf: "all",
  device: "",
  sort: "updated",
  bucket: "all",
  page: 1,
};

type SearchParamInput =
  | URLSearchParams
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

function hasGetter(value: SearchParamInput): value is URLSearchParams | { get(name: string): string | null } {
  return "get" in value && typeof value.get === "function";
}

function readParam(source: SearchParamInput, key: string): string | null {
  if (hasGetter(source)) {
    return source.get(key);
  }

  const value = source[key];
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : null;
  }
  return typeof value === "string" ? value : null;
}

export function parsePlatform(value: string | null): PlatformFilter {
  return value === "ios" || value === "macos" ? value : "all";
}

export function parseStatus(value: string | null): SummaryStatus | null {
  if (
    value === "playable" ||
    value === "ingame" ||
    value === "intro" ||
    value === "loads" ||
    value === "nothing" ||
    value === "untested"
  ) {
    return value;
  }
  return null;
}

export function parsePerf(value: string | null): PerfTier | "all" {
  if (value === "great" || value === "ok" || value === "poor" || value === "n/a") {
    return value;
  }
  return "all";
}

export function parseSort(value: string | null): SortKey {
  return value === "alpha" ? "alpha" : "updated";
}

export function parseScope(value: string | null): CompatibilityBrowseScope {
  return value === "all" ? "all" : "tested";
}

export function parseAlphaBucket(value: string | null): AlphaBucket {
  const normalized = String(value || "").trim().toUpperCase();
  if (ALPHA_BUCKETS.includes(normalized as AlphaBucket)) {
    return normalized as AlphaBucket;
  }
  return "all";
}

export function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

export function parseCompatibilityBrowseFilters(
  searchParams: SearchParamInput,
): CompatibilityBrowseFilters {
  const platform = parsePlatform(readParam(searchParams, "platform"));

  return {
    scope: parseScope(readParam(searchParams, "scope")),
    platform,
    q: (readParam(searchParams, "q") ?? "").trim(),
    status: parseStatus(readParam(searchParams, "status")),
    perf: parsePerf(readParam(searchParams, "perf")),
    device: platform === "all" ? "" : (readParam(searchParams, "device") ?? "").trim(),
    sort: parseSort(readParam(searchParams, "sort")),
    bucket: parseAlphaBucket(readParam(searchParams, "bucket")),
    page: parsePage(readParam(searchParams, "page")),
  };
}

export function buildCompatibilityBrowseQueryString(
  filters: CompatibilityBrowseFilters,
): string {
  const params = new URLSearchParams();

  if (filters.scope !== DEFAULT_COMPATIBILITY_BROWSE_FILTERS.scope) {
    params.set("scope", filters.scope);
  }
  if (filters.platform !== DEFAULT_COMPATIBILITY_BROWSE_FILTERS.platform) {
    params.set("platform", filters.platform);
  }
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.perf !== DEFAULT_COMPATIBILITY_BROWSE_FILTERS.perf) {
    params.set("perf", filters.perf);
  }
  if (filters.platform !== "all" && filters.device) {
    params.set("device", filters.device);
  }
  if (filters.sort !== DEFAULT_COMPATIBILITY_BROWSE_FILTERS.sort) {
    params.set("sort", filters.sort);
  }
  if (filters.bucket !== DEFAULT_COMPATIBILITY_BROWSE_FILTERS.bucket) {
    params.set("bucket", filters.bucket);
  }
  if (filters.page !== DEFAULT_COMPATIBILITY_BROWSE_FILTERS.page) {
    params.set("page", String(filters.page));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function alphaBucketForTitle(title: string): AlphaBucket {
  const normalized = String(title || "")
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalized) {
    return "#";
  }

  const firstChar = normalized[0]?.toUpperCase() ?? "#";
  if (/[0-9]/.test(firstChar)) return "0-9";
  if (/[A-Z]/.test(firstChar)) return firstChar as AlphaBucket;
  return "#";
}

export function alphaBucketLabel(bucket: AlphaBucket): string {
  if (bucket === "all") return "All";
  return bucket;
}

export function catalogBucketToSlug(bucket: CatalogBucket): CatalogBucketSlug {
  return bucket === "#" ? "other" : bucket;
}

export function parseCatalogBucketSlug(value: string): CatalogBucket | null {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "OTHER") return "#";
  return CATALOG_BUCKETS.includes(normalized as CatalogBucket)
    ? (normalized as CatalogBucket)
    : null;
}
