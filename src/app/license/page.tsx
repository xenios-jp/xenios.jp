import type { Metadata } from "next";
import {
  XENIA_UPSTREAM_LICENSE_TEXT_URL,
  XENIA_UPSTREAM_LICENSE_URL,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "License",
  description:
    "License terms that apply to XeniOS through inheritance from the Xenia project.",
};

async function fetchLicenseText(): Promise<string | null> {
  try {
    const res = await fetch(XENIA_UPSTREAM_LICENSE_TEXT_URL, {
      next: { revalidate: 24 * 60 * 60 },
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

export default async function LicensePage() {
  const licenseText = await fetchLicenseText();

  return (
    <div className="min-h-screen bg-bg-primary">
      <section className="hero-gradient border-b border-border pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            License
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            XeniOS inherits the upstream Xenia project license.
          </p>
          <p className="mt-4 text-text-muted">
            Source:{" "}
            <a
              href={XENIA_UPSTREAM_LICENSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              https://github.com/xenia-project/xenia/blob/master/LICENSE
            </a>
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-xl border border-border bg-bg-surface p-6 md:p-8">
          <h2 className="text-lg font-semibold text-text-primary">
            Upstream License Text
          </h2>
          {licenseText ? (
            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg bg-bg-primary p-4 text-sm text-text-secondary font-mono">
              {licenseText}
            </pre>
          ) : (
            <p className="mt-4 text-sm text-text-muted">
              The license could not be fetched right now. Use the link above for
              the canonical upstream license.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
