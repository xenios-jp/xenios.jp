import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compatibility",
  description:
    "Browse the XeniOS compatibility database with community-reported, device-specific status reports.",
};

export default function CompatibilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
