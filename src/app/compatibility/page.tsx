import {
  getCompatibilityCatalogOverview,
  getTestedCompatibilityListEntries,
} from "@/lib/game-detail";
import { CompatibilityList } from "./compatibility-list";

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
