import type { MetadataRoute } from "next";
import { getAllGames } from "@/lib/compatibility";
import {
  CATALOG_BUCKETS,
  alphaBucketForTitle,
  catalogBucketToSlug,
} from "@/lib/compatibility-browse";
import { COMPATIBILITY_CATALOG_PAGE_SIZE } from "@/lib/game-detail";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 86400;

const SITE_LAST_MODIFIED = new Date("2026-02-19T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const games = getAllGames();

  const staticRoutes = [
    "",
    "/builds",
    "/download",
    "/download/ios",
    "/download/mac",
    "/compatibility",
    "/compatibility/catalog",
    "/credits",
    "/privacy",
    "/docs",
    "/docs/ios/getting-started",
    "/docs/ios/settings",
    "/docs/ios/troubleshooting",
    "/docs/ios/reporting-bugs",
    "/docs/ios/developer",
    "/docs/mac/getting-started",
    "/docs/mac/settings",
    "/docs/mac/troubleshooting",
    "/docs/mac/reporting-bugs",
    "/docs/mac/developer",
    "/faq",
    "/legal",
    "/license",
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: SITE_LAST_MODIFIED,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));

  // Catalog pagination — pages 2..N for the all-titles catalog.
  const totalCatalogPages = Math.max(
    1,
    Math.ceil(games.length / COMPATIBILITY_CATALOG_PAGE_SIZE)
  );
  for (let page = 2; page <= totalCatalogPages; page += 1) {
    entries.push({
      url: `${SITE_URL}/compatibility/catalog/page/${page}`,
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  // Catalog buckets (A–Z, 0-9, other) and their inner pagination.
  const bucketCounts = new Map<string, number>();
  games.forEach((game) => {
    const bucket = alphaBucketForTitle(game.title);
    if (bucket === "all") return;
    bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
  });

  CATALOG_BUCKETS.forEach((bucket) => {
    const count = bucketCounts.get(bucket) ?? 0;
    if (count === 0) return;
    const bucketSlug = catalogBucketToSlug(bucket);
    entries.push({
      url: `${SITE_URL}/compatibility/catalog/${bucketSlug}`,
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.5,
    });
    const bucketPages = Math.max(
      1,
      Math.ceil(count / COMPATIBILITY_CATALOG_PAGE_SIZE)
    );
    for (let page = 2; page <= bucketPages; page += 1) {
      entries.push({
        url: `${SITE_URL}/compatibility/catalog/${bucketSlug}/page/${page}`,
        lastModified: SITE_LAST_MODIFIED,
        changeFrequency: "weekly",
        priority: 0.4,
      });
    }
  });

  games.forEach((game) => {
    const gameLastModified = new Date(game.updatedAt);
    entries.push({
      url: `${SITE_URL}/compatibility/${game.slug}`,
      lastModified: Number.isNaN(gameLastModified.getTime())
        ? SITE_LAST_MODIFIED
        : gameLastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  });

  return entries;
}
