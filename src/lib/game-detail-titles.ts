/**
 * Title parsing helpers shared between game-detail.ts and the discussion
 * synthesis pipeline. Pure string transforms — no I/O, no React, safe to
 * import from anywhere.
 */

const GENERIC_GAME_TITLE_PATTERN = /^Title [A-F0-9]{8}$/i;
const ISSUE_TITLE_ID_PREFIX_PATTERN = /^\[?[A-F0-9]{8}\]?\s*(?:—|-)\s*/i;
const WRAPPED_GAME_TITLE_PATTERN = /^\[(.+)\]([™®©])?$/u;

export function isGenericGameTitle(title?: string | null): boolean {
  if (!title) return true;
  return title === "Unknown Title" || GENERIC_GAME_TITLE_PATTERN.test(title.trim());
}

export function normalizeWrappedGameTitle(title: string): string {
  const wrappedMatch = title.match(WRAPPED_GAME_TITLE_PATTERN);
  if (!wrappedMatch) {
    return title;
  }

  const innerTitle = wrappedMatch[1]?.trim();
  const suffix = wrappedMatch[2] ?? "";
  return innerTitle ? `${innerTitle}${suffix}` : title;
}

export function parseGameTitleFromIssueTitle(issueTitle: string): string | null {
  const cleaned = normalizeWrappedGameTitle(
    issueTitle
      .trim()
      .replace(ISSUE_TITLE_ID_PREFIX_PATTERN, "")
      .replace(/^\[?[A-F0-9]{8}\]?\s*/i, "")
      .trim(),
  );

  return cleaned.length > 0 ? cleaned : null;
}

export function slugifySyntheticGameTitle(title: string, titleId: string): string {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || `title-${titleId.toLowerCase()}`;
}
