import type { Metadata } from "next";
import { Suspense } from "react";
import { getBuildsHistory } from "@/lib/builds";
import { BuildsPageClient } from "./builds-page-client";

export const metadata: Metadata = {
  title: "Builds",
  description: "Release and preview build history for XeniOS.",
};

export default function BuildsPage() {
  const builds = getBuildsHistory("all");
  return (
    <Suspense>
      <BuildsPageClient builds={builds} />
    </Suspense>
  );
}
