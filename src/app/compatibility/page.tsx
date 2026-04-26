import type { Metadata } from "next";
import {
  getCompatibilityCatalogOverview,
  getTestedCompatibilityListEntries,
} from "@/lib/game-detail";
import { withCanonical } from "@/lib/metadata";
import { CompatibilityList } from "./compatibility-list";

export const metadata: Metadata = withCanonical(
  {
    title: "Game Compatibility",
    description:
      "Community-reported XeniOS compatibility for Xbox 360 games on iPhone, iPad, and Mac. Browse tested titles, see device-specific status, and read player notes.",
  },
  "/compatibility"
);

export default async function CompatibilityPage() {
  const [entries, overview] = await Promise.all([
    getTestedCompatibilityListEntries(),
    getCompatibilityCatalogOverview(),
  ]);

  return (
    <CompatibilityList
      mode="tested"
      entries={entries}
      totalTracked={overview.totalTracked}
      testedCount={overview.testedCount}
      totalHiddenReports={overview.totalHiddenReports}
    />
  );
}
