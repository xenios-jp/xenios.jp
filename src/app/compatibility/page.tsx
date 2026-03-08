import { getCompatibilityListEntries } from "@/lib/game-detail";
import { CompatibilityList } from "./compatibility-list";

export default async function CompatibilityPage() {
  const entries = await getCompatibilityListEntries();
  return <CompatibilityList entries={entries} />;
}
