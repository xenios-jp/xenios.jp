// Edge-cache and validator behaviour of the public read routes.
// Run: npm test (bundles src/index.ts with wrangler, then runs this file).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const bundle = process.env.COMPAT_BUNDLE ?? path.resolve(import.meta.dirname, "../.test-build/index.js");

// ── fakes ──
class MemCache {
  constructor() { this.map = new Map(); this.puts = 0; }
  async match(key) {
    const e = this.map.get(String(key));
    return e ? new Response(e.body, { headers: e.headers }) : undefined;
  }
  async put(key, response) {
    this.puts++;
    this.map.set(String(key), { body: await response.text(), headers: new Headers(response.headers) });
  }
}

let origin, cache, now, fetches, env, isolates = 0;
// The Worker keeps its copy in memory per source URL; a new branch name stands for a new isolate.
const newIsolate = () => { env = {COMPAT_REPO_BRANCH: `test-${++isolates}`}; };
const realNow = Date.now;
globalThis.caches = { get default() { return cache; } };
Date.now = () => now;
globalThis.fetch = async (url, init = {}) => {
  fetches.push({ url: String(url), ifNoneMatch: new Headers(init.headers).get("If-None-Match") });
  const etag = `"origin-${origin.version}"`;
  if (new Headers(init.headers).get("If-None-Match") === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
  return new Response(JSON.stringify(origin.games, null, 2) + "\n", { headers: { ETag: etag, "Content-Type": "text/plain" } });
};

const { default: worker } = await import(pathToFileURL(bundle).href);

function makeGames(n, note = "") {
  return Array.from({ length: n }, (_, i) => ({
    titleId: (0x41560000 + i).toString(16).toUpperCase(),
    title: `Game ${i}${note}`,
    status: "playable",
    reports: [{ id: i, notes: "ünïcode ✓" }],
    summaries: { release: { status: "playable" } },
  }));
}

// The worker may normalise stored games; titles and ids pass through unchanged.
function assertSameGames(body, games) {
  const got = JSON.parse(body);
  assert.deepEqual(got.map((g) => [g.titleId, g.title]), games.map((g) => [g.titleId, g.title]));
}

async function call(pathname, headers = {}) {
  const pending = [];
  const ctx = { waitUntil: (p) => pending.push(p), passThroughOnException() {} };
  const res = await worker.fetch(new Request(`https://x.test${pathname}`, { headers }), env, ctx);
  const body = res.status === 304 ? null : await res.text();
  await Promise.all(pending);
  return { res, body };
}

beforeEach(() => {
  origin = { version: 1, games: makeGames(5) };
  cache = new MemCache();
  now = 1_800_000_000_000;
  fetches = [];
  newIsolate();
});

test("/games serves the compact body with an ETag and cache headers", async () => {
  const { res, body } = await call("/games");
  assert.equal(res.status, 200);
  assertSameGames(body, origin.games);
  assert.doesNotMatch(body, /\n/); // compact, not GitHub's pretty-printed file
  assert.match(res.headers.get("ETag"), /^"[0-9a-f]{32}"$/);
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=300, stale-while-revalidate=600");
  assert.equal(res.headers.get("Vary"), "Accept-Encoding");
  assert.equal(res.headers.get("Access-Control-Expose-Headers"), "ETag");
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(res.headers.get("X-Compat-Cache"), "miss");
});

test("/games is served from memory without another origin fetch", async () => {
  const first = await call("/games");
  const second = await call("/games");
  assert.equal(fetches.length, 1);
  assert.equal(second.res.headers.get("X-Compat-Cache"), "hit");
  assert.equal(second.body, first.body);
  assert.equal(second.res.headers.get("ETag"), first.res.headers.get("ETag"));
});

test("If-None-Match (strong, weak, list) gets 304 with no body", async () => {
  const { res } = await call("/games");
  const tag = res.headers.get("ETag");
  for (const inm of [tag, `W/${tag}`, `"other", W/${tag}`, "*"]) {
    const r = await call("/games", { "If-None-Match": inm });
    assert.equal(r.res.status, 304, inm);
    assert.equal(r.res.headers.get("ETag"), tag);
    assert.equal(r.res.headers.get("Access-Control-Expose-Headers"), "ETag");
  }
  const miss = await call("/games", { "If-None-Match": '"nope"' });
  assert.equal(miss.res.status, 200);
  assert.equal(fetches.length, 1);
});

test("a stale copy is served at once and refreshed in the background, conditionally", async () => {
  const first = await call("/games");
  now += 301_000;
  const stale = await call("/games");
  assert.equal(stale.res.headers.get("X-Compat-Cache"), "stale");
  assert.equal(stale.body, first.body);
  assert.equal(fetches.length, 2);
  assert.equal(fetches[1].ifNoneMatch, '"origin-1"'); // origin answered 304
  const after = await call("/games");
  assert.equal(after.res.headers.get("X-Compat-Cache"), "hit");
  assert.equal(after.res.headers.get("ETag"), first.res.headers.get("ETag"));
  assert.equal(fetches.length, 2);
});

test("a changed origin file gives a new body and ETag after the refresh", async () => {
  const first = await call("/games");
  origin = { version: 2, games: makeGames(6, " v2") };
  now += 301_000;
  await call("/games"); // stale, refreshes
  const next = await call("/games");
  assertSameGames(next.body, origin.games);
  assert.notEqual(next.res.headers.get("ETag"), first.res.headers.get("ETag"));
  const old = await call("/games", { "If-None-Match": first.res.headers.get("ETag") });
  assert.equal(old.res.status, 200);
});

test("the same data gives the same ETag in another isolate and data center", async () => {
  const a = await call("/games");
  cache = new MemCache();
  newIsolate();
  const b = await call("/games");
  assert.equal(b.res.headers.get("X-Compat-Cache"), "miss");
  assert.equal(a.res.headers.get("ETag"), b.res.headers.get("ETag"));
  assert.equal(fetches.length, 2);
});

test("a new isolate takes the data center's Cache API copy where there is one", async () => {
  const a = await call("/games");
  newIsolate();
  const b = await call("/games");
  assert.equal(b.res.headers.get("X-Compat-Cache"), "shared");
  assert.equal(b.body, a.body);
  assert.equal(fetches.length, 1);
});

test("with no Cache API copy, memory alone serves repeats", async () => {
  cache = { match: async () => undefined, put: async () => {} };
  await call("/games");
  const again = await call("/games");
  assert.equal(again.res.headers.get("X-Compat-Cache"), "hit");
  assert.equal(fetches.length, 1);
});

test("discussion: same payload as before, from the snapshot in memory, 304 on its tag", async () => {
  await call("/games");
  const g = origin.games[2];
  const first = await call(`/games/${g.titleId.toLowerCase()}/discussion`);
  assert.equal(first.res.status, 200);
  const games = JSON.parse((await call("/games")).body);
  const stored = games.find((x) => x.titleId === g.titleId);
  assert.deepEqual(JSON.parse(first.body), {
    found: true, titleId: g.titleId, title: g.title, status: g.status,
    issueNumber: null, issueUrl: null, reports: stored.reports, summaries: stored.summaries,
  });
  const tag = first.res.headers.get("ETag");
  const second = await call(`/games/${g.titleId}/discussion`);
  assert.equal(second.res.headers.get("X-Compat-Cache"), "hit");
  assert.equal(second.body, first.body);
  assert.equal(fetches.length, 1);
  const nm = await call(`/games/${g.titleId}/discussion`, { "If-None-Match": `W/${tag}` });
  assert.equal(nm.res.status, 304);

  // New snapshot: new tag, rebuilt body.
  origin = { version: 2, games: makeGames(5, " v2") };
  now += 301_000;
  await call("/games");
  const rebuilt = await call(`/games/${g.titleId}/discussion`);
  assert.notEqual(rebuilt.res.headers.get("ETag"), tag);
  assert.equal(JSON.parse(rebuilt.body).title, `${g.title} v2`);
});

test("discussion for an unknown title keeps the not-found shape", async () => {
  const { res, body } = await call("/games/DEADBEEF/discussion");
  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(body), { found: false, titleId: "DEADBEEF", reports: [], issueNumber: null, issueUrl: null });
});

test("errors are not cacheable, preflight is cached by browsers", async () => {
  const { res } = await call("/nope");
  assert.equal(res.status, 404);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  const pre = await worker.fetch(new Request("https://x.test/games", { method: "OPTIONS" }), env, { waitUntil() {} });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("Access-Control-Max-Age"), "86400");
  assert.match(pre.headers.get("Access-Control-Allow-Headers"), /If-None-Match/);
});

test("an origin failure on a cold cache is a 500, not a cached error", async () => {
  globalThis.fetch = async () => new Response("boom", { status: 503 });
  const { res } = await call("/games");
  assert.equal(res.status, 500);
  assert.equal(cache.map.size, 0);
  assert.equal((await call("/games")).res.status, 500, "and not remembered");
});

process.on("exit", () => { Date.now = realNow; });
