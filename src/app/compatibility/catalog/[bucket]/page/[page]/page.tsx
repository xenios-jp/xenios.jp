import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CATALOG_BUCKETS,
  alphaBucketLabel,
  catalogBucketToSlug,
  parseCatalogBucketSlug,
} from "@/lib/compatibility-browse";
import {
  COMPATIBILITY_CATALOG_PAGE_SIZE,
  getCompatibilityCatalogOverview,
  getCompatibilityCatalogBucketEntries,
  getCompatibilityCatalogPageData,
} from "@/lib/game-detail";
import { withCanonical } from "@/lib/metadata";
import { CompatibilityList } from "../../../../compatibility-list";

const EMPTY_BUCKET_PAGE_STATIC_PARAM = {
  bucket: "__placeholder__",
  page: "2",
} as const;

export async function generateStaticParams() {
  const params: Array<{ bucket: string; page: string }> = [];

  for (const bucket of CATALOG_BUCKETS) {
    const entries = await getCompatibilityCatalogBucketEntries(bucket);
    const pageCount = Math.max(1, Math.ceil(entries.length / COMPATIBILITY_CATALOG_PAGE_SIZE));

    for (let page = 2; page <= pageCount; page += 1) {
      params.push({
        bucket: catalogBucketToSlug(bucket),
        page: String(page),
      });
    }
  }

  // `output: "export"` requires at least one param to validate this route.
  // When the mirrored dataset has no bucket with a second page, return a
  // placeholder path that immediately resolves to notFound().
  return params.length > 0 ? params : [EMPTY_BUCKET_PAGE_STATIC_PARAM];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bucket: string; page: string }>;
}): Promise<Metadata> {
  const { bucket: rawBucket, page: rawPage } = await params;
  const bucket = parseCatalogBucketSlug(rawBucket);
  const page = Number(rawPage);
  if (!bucket || !Number.isInteger(page) || page < 2) {
    return { title: "Compatibility Catalog" };
  }

  return withCanonical(
    {
      title: `Compatibility Catalog ${alphaBucketLabel(bucket)} Page ${page}`,
      description: `Browse page ${page} of the ${alphaBucketLabel(bucket)} compatibility bucket.`,
    },
    `/compatibility/catalog/${catalogBucketToSlug(bucket)}/page/${page}`,
  );
}

export default async function CompatibilityCatalogBucketPagedPage({
  params,
}: {
  params: Promise<{ bucket: string; page: string }>;
}) {
  const { bucket: rawBucket, page: rawPage } = await params;
  const bucket = parseCatalogBucketSlug(rawBucket);
  const page = Number(rawPage);
  if (!bucket || !Number.isInteger(page) || page < 2) notFound();

  const [pageData, overview] = await Promise.all([
    getCompatibilityCatalogPageData(bucket, page),
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
      activeBucket={bucket}
      catalogSummaryByPlatform={pageData.summaryByPlatform}
      catalogPage={pageData.page}
      catalogPageCount={pageData.pageCount}
      catalogTotalEntries={pageData.totalEntries}
      catalogBasePath={`/compatibility/catalog/${catalogBucketToSlug(bucket)}`}
    />
  );
}
