import type { Metadata } from "next";

export function withCanonical(metadata: Metadata, pathname: string): Metadata {
  return {
    ...metadata,
    alternates: {
      ...(metadata.alternates ?? {}),
      canonical: pathname,
    },
  };
}
