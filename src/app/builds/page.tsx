import type { Metadata } from "next";
import { getBuildsHistory } from "@/lib/builds";
import { withCanonical } from "@/lib/metadata";
import { BuildsPageClient } from "./builds-page-client";

export const metadata: Metadata = withCanonical(
  {
    title: "Builds",
    description: "Release build history for XeniOS.",
  },
  "/builds"
);

export default function BuildsPage() {
  const builds = getBuildsHistory("all");
  return <BuildsPageClient builds={builds} />;
}
