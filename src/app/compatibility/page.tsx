import { getAllGames } from "@/lib/compatibility";
import { CompatibilityList } from "./compatibility-list";

export default function CompatibilityPage() {
  const games = getAllGames();
  return <CompatibilityList games={games} />;
}
