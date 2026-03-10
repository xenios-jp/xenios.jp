import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CATALOG_BUCKETS,
  alphaBucketLabel,
  catalogBucketToSlug,
  parseCatalogBucketSlug,
} from "@/lib/compatibility-browse";
import {
  getCompatibilityCatalogOverview,
  getCompatibilityCatalogPageData,
} from "@/lib/game-detail";
import { withCanonical } from "@/lib/metadata";
import { CompatibilityList } from "../../compatibility-list";

export async function generateStaticParams() {
  return CATALOG_BUCKETS.map((bucket) => ({
    bucket: catalogBucketToSlug(bucket),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bucket: string }>;
}): Promise<Metadata> {
  const { bucket: rawBucket } = await params;
  const bucket = parseCatalogBucketSlug(rawBucket);
  if (!bucket) {
    return { title: "Compatibility Catalog" };
  }

  return withCanonical(
    {
      title: `Compatibility Catalog ${alphaBucketLabel(bucket)}`,
      description: `Browse XeniOS compatibility catalog titles in the ${alphaBucketLabel(
        bucket,
      )} bucket.`,
    },
    `/compatibility/catalog/${catalogBucketToSlug(bucket)}`,
  );
}

export default async function CompatibilityCatalogBucketPage({
  params,
}: {
  params: Promise<{ bucket: string }>;
}) {
  const { bucket: rawBucket } = await params;
  const bucket = parseCatalogBucketSlug(rawBucket);
  if (!bucket) notFound();

  const [pageData, overview] = await Promise.all([
    getCompatibilityCatalogPageData(bucket, 1),
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
      activeBucket={bucket}
      catalogSummaryByPlatform={pageData.summaryByPlatform}
      catalogPage={pageData.page}
      catalogPageCount={pageData.pageCount}
      catalogTotalEntries={pageData.totalEntries}
      catalogBasePath={`/compatibility/catalog/${catalogBucketToSlug(bucket)}`}
    />
  );
}
