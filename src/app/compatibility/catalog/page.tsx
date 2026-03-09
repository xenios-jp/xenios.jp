import type { Metadata } from "next";
import {
  getCompatibilityCatalogOverview,
  getCompatibilityCatalogPageData,
} from "@/lib/game-detail";
import { withCanonical } from "@/lib/metadata";
import { CompatibilityList } from "../compatibility-list";

export const metadata: Metadata = withCanonical(
  {
    title: "Compatibility Catalog",
    description:
      "Browse the full XeniOS compatibility catalog with static category tabs and paginated pages.",
  },
  "/compatibility/catalog",
);

export default async function CompatibilityCatalogPage() {
  const [pageData, overview] = await Promise.all([
    getCompatibilityCatalogPageData(null, 1),
    getCompatibilityCatalogOverview(),
  ]);

  return (
    <CompatibilityList
      mode="catalog"
      entries={pageData.entries}
      totalTracked={overview.totalTracked}
      testedCount={overview.testedCount}
      totalHiddenReports={overview.totalHiddenReports}
      bucketCounts={overview.bucketCounts}
      catalogSummaryByPlatform={pageData.summaryByPlatform}
      catalogPage={pageData.page}
      catalogPageCount={pageData.pageCount}
      catalogTotalEntries={pageData.totalEntries}
      catalogBasePath="/compatibility/catalog"
    />
  );
}
