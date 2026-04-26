# XeniOS Website Audit Report

_Date: 2026-04-26_
_Branch: `claude/website-audit-report-bfs5e`_
_Method: 5 parallel specialist audits (UX/design, performance/build, SEO/accessibility, code quality/architecture, security/privacy). No code changes._

---

## Executive Summary

The site is in good shape overall. It has a lean dependency footprint (only `next`, `react`, `react-dom`, `next-themes` at runtime), a sensible App Router layout, working dark mode, a skip-link, semantic landmarks, and a clean Tailwind v4 setup. Where it falls short is the connective tissue around it: security headers, structured data, payload sizing, and a small number of accessibility regressions concentrated in the mobile menu.

The single biggest leverage point is the **compatibility data path**: a 6.2 MB `data.json` is shipped to the client on demand, and `generateStaticParams` likely pre-renders thousands of game pages on every build. Splitting the search index from the full dataset and reining in static generation will improve build times, Cloudflare egress, and mobile responsiveness all at once.

The second biggest theme is **trust signals**: missing OG images, no JSON-LD, missing `/compatibility` metadata, and a privacy policy that does not disclose Cloudflare Web Analytics. These hurt SEO, social sharing, and (for EU visitors) potentially compliance.

A handful of quick wins under §3 will deliver most of the user-facing improvement with very little risk.

---

## 1. Top 10 cross-cutting priorities

These are the items that came up in more than one audit, or where the risk/effort ratio is best. Tackle these first.

| # | Finding | Domains | Effort | Impact |
|---|---|---|---|---|
| 1 | Compatibility catalog ships 6.2 MB JSON to clients on demand; `generateStaticParams` likely pre-renders thousands of game pages. | Perf, Code | M | High |
| 2 | No security headers in `public/_headers` (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy). | Security | S | High |
| 3 | Privacy policy does not disclose Cloudflare Web Analytics (`beacon.min.js`) embedded in `layout.tsx:72-74`. | Security, Legal | S | High |
| 4 | Mobile menu missing `aria-expanded`, no Escape handler, no focus restoration on close. | UX, A11y | S | High |
| 5 | `/compatibility` page has no `export const metadata` and the site has zero JSON-LD / structured data despite being a games database. | SEO | S–M | High |
| 6 | Worker `/report` and `/board` endpoints have no rate limiting and don't bound screenshot/title/notes sizes. | Security | M | High |
| 7 | Light-mode `Callout` borders (`border-l-blue-400`, `border-l-amber-400`) have no `dark:` variants — washed out in dark mode. | UX, A11y | S | Medium |
| 8 | No OG image (`openGraph.images`) on root metadata; social previews are blank. | SEO | S | Medium |
| 9 | Duplicate normalization helpers (`asRecord`, `cleanString`, `cleanNumber`, `cleanBoolean`, regex patterns, `STATUS_RANK`) across `lib/compatibility.ts`, `lib/builds.ts`, `lib/game-detail.ts`, and several `scripts/*.mjs`. | Code | M | Medium |
| 10 | Data-prep scripts (`build:compat-data`, `build:credits`, `build:discussions`, `build:release-data`) are not chained into `npm run build`, so a fresh build can ship stale or missing data. | Perf, Build | S | Medium |

---

## 2. Recommended phasing

**Phase 1 — Hardening sprint (1–2 days):**
Items 2, 3, 4, 6, 8, 10. All are small, well-scoped, and individually low-risk.

**Phase 2 — Trust + discoverability (3–5 days):**
Item 5 (page metadata + JSON-LD), sitemap pagination, canonical handling for the bucket/page overlap, color-contrast pass on `text-text-muted`.

**Phase 3 — Data layer + architecture (1–2 weeks):**
Items 1, 9. Split `compatibility-list.tsx` (1,305 lines), extract a shared normalization module, scope `generateStaticParams` to top-N games.

**Phase 4 — Optional/strategic:**
Move off `output: "export"` to enable ISR; integrate error tracking; add Dependabot; add architecture docs.

---

## 3. Quick wins (≤1 hour each)

- Add `aria-expanded={mobileOpen}` to the mobile menu button (`navbar.tsx:194-204`).
- Add `Cache-Control: public,max-age=3600,stale-while-revalidate=86400` for `/compatibility/*.json` in `public/_headers`.
- Add a `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` block in `public/_headers` for `/*`.
- Add Cloudflare Web Analytics disclosure to `src/app/privacy/page.tsx`.
- Chain data scripts into `build`: `"build": "npm run build:compat-data && npm run build:credits && npm run build:discussions && npm run build:release-data && next build"`.
- Add `openGraph.images` and `twitter.images` to the root metadata (`src/app/layout.tsx`); add a 1200×630 PNG to `public/og-image.png`.
- Remove `min-w-[220px]` from the homepage Canary/Edge cards (`src/app/page.tsx:175-191`) — fixes a horizontal mobile overflow.
- Reword the iOS 26.4 beta callout (`src/app/download/ios/page.tsx:195, 278`) — version number reads as forward-looking placeholder copy.
- Add `dark:` variants to `Callout` borders (`src/components/callout.tsx:10-68`).

---

## 4. Findings by domain

### 4.1 UX, content, design

**Critical**
- **Homepage cards force horizontal overflow on mobile.** `min-w-[220px]` on the Canary/Edge cards in `src/app/page.tsx:175-191` overrides the parent grid. Replace with `min-w-0 flex-1`.
- **Callout dark-mode contrast.** `src/components/callout.tsx:10-68` hardcodes `border-l-blue-400` / `-amber-400` etc. without `dark:` overrides. Compare with `pill.tsx`, which does this correctly via a variant map.
- **Accordion uses array index as React key.** `src/components/accordion.tsx:69` — breaks reconciliation if items are ever filtered/reordered.

**High**
- iOS 26.4 beta wording in `src/app/download/ios/page.tsx:195, 278` reads as placeholder.
- Compatibility preview table on the homepage hides "Tested On" via `hidden sm:table-cell` (`page.tsx:245-246`) without a mobile fallback. Device variance is the whole point of the dataset.
- JIT setup steps on `download/ios/page.tsx:182-220` are buried in prose with multiple inline links — convert to a numbered checklist.
- `state-strip.tsx:18` hides the third item on mobile (`i >= 2 ? "hidden sm:flex"`); on the homepage that means the Mac build status disappears.
- Docs sidebar over-emphasizes the active item (`docs-sidebar.tsx:39-46`): color + weight + background + left border. Pick two.

**Medium / polish**
- FAQ page (`src/app/faq/page.tsx:681-725`) has anchor IDs but no on-page table of contents.
- Compatibility list (`src/app/compatibility/compatibility-list.tsx`) has no documented empty state.
- Credits page table (`src/app/credits/page.tsx:103-155`) uses a sticky-left column on mobile, which feels awkward — consider stacked `<dl>` below `md:`.
- Mac download buttons (`src/app/download/mac/page.tsx:338-342`) don't visually read as primary CTAs.
- Hero title relies on `-webkit-background-clip: text` (`globals.css:129-162`) without a fallback color — older Firefox shows nothing. Wrap in `@supports`.
- Footer "GitHub" text link duplicates the navbar GitHub icon.
- `IosReadFirst` (`src/components/ios-read-first.tsx:9-27`) uses an ad-hoc `tone` prop where a variant map would be more consistent with the rest of the design system.

### 4.2 Performance & build

**Critical**
- **6.2 MB `compatibility/data.json` + 1.8 MB `search-index.json`** loaded by the client when the catalog/search is engaged (`compatibility-list.tsx:681-710`). Even gzipped this is 1.5–2 MB on demand. Split: ship search-index for browsing, lazy-fetch full reports only on detail pages.
- **Build scripts not wired into `build`.** `package.json:6-20` — `next build` runs alone. Stale data ships if CI doesn't explicitly orchestrate the data scripts.
- **`generateStaticParams` likely pre-renders 1000+ game pages** (`src/app/compatibility/[slug]/page.tsx:12-14`). Either narrow to top-N or rely on dynamic rendering with caching.

**High**
- No cache headers on `/compatibility/*.json`. Add `max-age=3600, stale-while-revalidate=86400`.
- The Cloudflare Worker (`worker/src/index.ts`, ~2,200 lines) does GitHub-commit-on-write per report. ~1–3s CPU/request and within range of GitHub's 5,000/hour rate limit. Worth queuing/batching.
- `data/discussions.json` (499 KB) is mirrored to `public/compatibility/discussions.json` — verify it's actually consumed; otherwise drop the mirror.

**Medium / Low**
- `output: "export"` (`next.config.ts`) blocks ISR — every data refresh requires a full rebuild.
- Next 16 + React 19 are very new — pin exact versions and watch advisories.
- `next/font` is wired correctly with `display: "swap"`.
- Game screenshots (~1.4 MB across 9 JPEGs in `public/compatibility/screenshots/`) are not WebP and don't appear to go through `next/image`.

### 4.3 SEO & accessibility

**SEO — Critical**
- `src/app/compatibility/page.tsx` has no `export const metadata`. This is a top landing page.
- No JSON-LD anywhere. For a games-compatibility site, `SoftwareApplication` (root layout) and `VideoGame` (per-slug pages) would be high-value.

**SEO — High**
- Catalog routes overlap: `/compatibility/catalog`, `/compatibility/catalog/[bucket]`, `/compatibility/catalog/page/[N]`, `/compatibility/catalog/[bucket]/page/[N]`. Add `rel=prev`/`rel=next` and explicit canonicals to dedupe.
- `src/app/sitemap.ts` does not enumerate paginated/bucketed catalog routes. Crawl budget waste.
- Hardcoded `https://xenios.jp` in the sitemap — derive from `metadataBase` or env.

**SEO — Low**
- `openGraph.images` / `twitter.images` are not set on the root metadata.

**A11y — Critical**
- Mobile menu (`src/components/navbar.tsx:193-230`):
  - missing `aria-expanded`
  - no Escape-to-close
  - no focus return to the toggle on close
  - the menu DOM is always present (just CSS-hidden) — keyboard users can tab into hidden items. Use `hidden`/`inert` or conditional render.

**A11y — High**
- `--color-text-muted: #a1a1aa` on white (`globals.css:36`) is borderline 4.5:1 — fine for ≥18 px, fragile for body copy. Darken to ~`#71717a` / `#757575` in light mode.
- Compatibility list filter inputs (`compatibility-list.tsx:1073-1142`) use `aria-label` only; replace with `<label htmlFor>` for larger tap targets and better SR output.

**A11y — Medium**
- Accordion has no Escape handler (`src/components/accordion.tsx:39-51`).
- `prefers-reduced-motion` is handled in `globals.css:204-220` but the accordion grid-rows transition and the navbar `max-h` transition aren't gated by it.
- `focus-visible` is configured globally but Link cards in `page.tsx` should be re-tested by tabbing through.

**A11y — Low**
- Game-screenshot alt text could be more descriptive than "Compatibility image for ${title}".

### 4.4 Code quality & architecture

**Critical**
- **Duplicated normalization helpers**: `asRecord`, `cleanString`, `cleanNumber`, `cleanBoolean` exist in both `src/lib/compatibility.ts` and `src/lib/builds.ts`, and again across `scripts/rebuild-compatibility-data.mjs`, `scripts/repair-release-builds.mjs`, `scripts/sync-public-compat-data.mjs`. Risk of drift; extract to `src/lib/normalization.ts`.
- **`src/lib/game-detail.ts` is 1,684 lines / 65+ helpers.** Split into normalize / compare / partition modules.
- **`src/lib/compatibility.ts` calls `getCurrentReleaseBuild` twice per game** (lines ~476-478, ~710-712), each time re-casting `releaseBuildsData` from scratch. Cache the parsed manifest at module level.

**High**
- Status-rank constants are defined in three places (`compatibility.ts:135-141`, `game-detail.ts:40-55`, `scripts/rebuild-compatibility-data.mjs:14-20`). Centralize in `src/lib/constants.ts`.
- `src/app/compatibility/compatibility-list.tsx` is 1,305 lines, all client-side. Split into filters, table, hook.
- `src/app/error.tsx` and `src/app/not-found.tsx` are stubs — no logging of `error.digest`, no breadcrumbs on 404, no graceful UI for failed live-data fetches in `game-detail.ts:1054-1076` (which currently return `null` silently).
- Build scripts duplicate `cleanString`, `normalizeTitleId`, `normalizeStringArray` — same root cause as #1 above.

**Medium / Low**
- `tsconfig.json` has `strict: true` but doesn't enable `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`.
- `eslint.config.mjs` is the bare Next default — consider `no-unused-vars`, `no-console`.
- `worker/src/index.ts` redeclares `GameStatus`, `Platform`, `BuildInfo`, `GameReport` — share types via a neutral package or `types/` dir.
- `navbar.tsx` is `"use client"` but only needs client behavior for the mobile toggle — splittable.
- README is minimal; no `ARCHITECTURE.md`, `CONTRIBUTING.md`, or worker-contract docs.
- React `cache()` usage in `lib/builds.ts` and `lib/game-detail.ts` is correct; no documented invalidation strategy.

### 4.5 Security & privacy

**Critical**
- **No security headers** in `public/_headers`. Add CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy for `/*`. The current file only configures cache.
- **Cloudflare Web Analytics is undisclosed** in the privacy policy. The beacon (`layout.tsx:72-74`) collects IP and pageview data; the privacy page does not mention it. Fix is a copy edit, but it's a meaningful compliance gap for EU visitors.
- **Worker CORS uses `Access-Control-Allow-Origin: *`** (`worker/src/index.ts:542-547`). Restrict to `https://xenios.jp` (and `www.` if used).

**High**
- **No rate limiting on `/report` or `/board`** (`worker/src/index.ts:2105-2199`). With a leaked Bearer token, an attacker can flood GitHub commits and Discord posts. Add per-IP and per-token caps.
- **Screenshot uploads aren't size-bounded.** `uploadReportScreenshots` (`worker/src/index.ts:1467-1501`) accepts up to 5 base64 strings with no per-image limit. Cap at 5 MB each.
- **GitHub PAT has no documented rotation policy.** Wrangler secret only — quarterly rotation or move to OIDC federation.

**Medium**
- `validatePayload` (`worker/src/index.ts:612-627`) doesn't bound `title`/`notes` length. Cap at 255/2000 chars.
- `titleId` is accepted as any non-empty string. Xbox 360 IDs are 8 hex chars — `/^[A-Fa-f0-9]{8}$/`.
- Wrangler version mismatch: root `package.json` is `^4.69.0`, `worker/package.json` is `^3`.
- The Cloudflare beacon token (`c6a93f64730d401e9f90e0b87231270f`) is hardcoded in client HTML. Public by Cloudflare's design, but worth confirming and documenting.

**Low / Informational**
- Verbose `console.log` calls remain in worker code paths. Gate behind `env.DEBUG`.
- License page (`src/app/license/page.tsx:63-71`) has a fallback message but no real fallback text. Consider compiling the license string at build time.
- Discussions data mirrored from GitHub is not mentioned in the privacy policy.
- Beacon script has no SRI `integrity` attribute (Cloudflare doesn't publish one, so this is informational).
- `robots.ts` does not disallow `/compatibility/screenshots/*`.

**Things that are correctly done** — worth noting since they're easy to miss:
- Discord interactions verified with Ed25519 signatures.
- Bearer auth on report endpoints.
- No `dangerouslySetInnerHTML`, `eval`, or `new Function()` anywhere in `src/`.
- No secrets committed; `.gitignore` excludes `.env*`.
- `next/font` configured with `display: "swap"`.
- Skip-to-content link present (`layout.tsx:59-64`).

---

## 5. Suggested next steps

If you'd like, the natural follow-up is to pick a phase from §2 and have me draft a focused PR for it. The Phase 1 hardening sprint is probably the highest signal-to-effort ratio — almost all of those items are local edits to one or two files each, with no architectural risk.

Let me know which phase (or specific items) you'd like to address first and I'll plan the implementation.
