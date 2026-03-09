import type { Metadata } from "next";
import { withCanonical } from "@/lib/metadata";

export const metadata: Metadata = withCanonical(
  {
    title: "Compatibility",
    description:
      "Browse the XeniOS compatibility database with community-reported, device-specific status reports.",
  },
  "/compatibility"
);

export default function CompatibilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
