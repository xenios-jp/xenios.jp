import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 86400;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/compatibility/screenshots/", "/compatibility/data.json"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
