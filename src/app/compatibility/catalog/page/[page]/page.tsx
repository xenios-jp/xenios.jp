import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  COMPATIBILITY_CATALOG_PAGE_SIZE,
  getCompatibilityCatalogOverview,
  getCompatibilityCatalogPageData,
} from "@/lib/game-detail";
import { withCanonical } from "@/lib/metadata";
import { CompatibilityList } from "../../../compatibility-list";

export const dynamicParams = false;

async function getAllCatalogPageCount(): Promise<number> {
  const overview = await getCompatibilityCatalogOverview();
  return Math.max(1, Math.ceil(overview.totalTracked / COMPATIBILITY_CATALOG_PAGE_SIZE));
}

export async function generateStaticParams() {
  const pageCount = await getAllCatalogPageCount();
  return Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => ({
    page: String(index + 2),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page: rawPage } = await params;
  const page = Number(rawPage);
  if (!Number.isInteger(page) || page < 2) {
    return { title: "Compatibility Catalog" };
  }

  return withCanonical(
    {
      title: `Compatibility Catalog Page ${page}`,
      description: `Browse page ${page} of the full XeniOS compatibility catalog.`,
    },
    `/compatibility/catalog/page/${page}`,
  );
}

export default async function CompatibilityCatalogPagedPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page: rawPage } = await params;
  const page = Number(rawPage);
  if (!Number.isInteger(page) || page < 2) notFound();

  const [pageData, overview] = await Promise.all([
    getCompatibilityCatalogPageData(null, page),
    getCompatibilityCatalogOverview(),
  ]);

  if (pageData.page !== page) notFound();

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
