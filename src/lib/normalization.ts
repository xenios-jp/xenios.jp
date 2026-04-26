/**
 * Generic input normalization helpers shared across the data layer.
 *
 * `compatibility.ts` and `builds.ts` historically each defined their own
 * copies of these. They diverged on two intentional points:
 *
 *   1. Some callers want `string | null` (so `??` can fall through);
 *      others want `string | undefined` to satisfy optional fields on
 *      strict types.
 *   2. The build manifest treats sentinel placeholders ("n/a", "tbd",
 *      "placeholder") as missing data, while compatibility data does not.
 *
 * Both of those concerns are encoded as explicit options below so the
 * shared helpers cover every existing usage without behavior changes.
 */

const DEFAULT_BUILD_SENTINELS = new Set(["n/a", "tbd", "placeholder"]);

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function trimmedNonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function cleanStringOrNull(value: unknown): string | null {
  return trimmedNonEmpty(value);
}

export function cleanStringOrUndefined(
  value: unknown,
  options: { sentinels?: Iterable<string> } = {},
): string | undefined {
  const trimmed = trimmedNonEmpty(value);
  if (trimmed === null) return undefined;
  const sentinels = options.sentinels ? new Set(options.sentinels) : null;
  if (sentinels && sentinels.has(trimmed.toLowerCase())) return undefined;
  return trimmed;
}

export function cleanBuildString(value: unknown): string | undefined {
  return cleanStringOrUndefined(value, { sentinels: DEFAULT_BUILD_SENTINELS });
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function cleanNumberOrNull(value: unknown): number | null {
  return toFiniteNumber(value);
}

export function cleanNumberOrUndefined(value: unknown): number | undefined {
  return toFiniteNumber(value) ?? undefined;
}

export function cleanBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
