import type { MetadataRoute } from "next";
import { getAllGames } from "@/lib/compatibility";

export const revalidate = 86400;

const SITE_LAST_MODIFIED = new Date("2026-02-19T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const games = getAllGames();

  const staticRoutes = [
    "",
    "/download",
    "/download/ios",
    "/download/mac",
    "/compatibility",
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
    "/faq/ios",
    "/faq/mac",
    "/legal",
    "/license",
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `https://xenios.jp${route}`,
    lastModified: SITE_LAST_MODIFIED,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));

  games.forEach((game) => {
    const gameLastModified = new Date(game.updatedAt);
    entries.push({
      url: `https://xenios.jp/compatibility/${game.slug}`,
      lastModified: Number.isNaN(gameLastModified.getTime())
        ? SITE_LAST_MODIFIED
        : gameLastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  });

  return entries;
}
