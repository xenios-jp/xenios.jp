import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "XeniOS documentation for iPhone/iPad and Mac — installation, settings, troubleshooting, and more.",
};

export default function DocsPage() {
  return (
    <div>
      <p className="mb-6 text-[15px] leading-relaxed text-text-secondary">
        New here? Pick your device first, then open{" "}
        <strong className="text-text-primary">Getting Started</strong> for that
        platform.
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Link
          href="/docs/ios/getting-started"
          className="group rounded-xl border border-border bg-bg-surface p-8 transition-colors hover:border-border-hover"
        >
          <h2 className="text-2xl font-semibold text-text-primary">
            iPhone / iPad
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
            Install guide, JIT setup, settings reference, and troubleshooting
            for iPhone and iPad builds.
          </p>
          <span className="mt-4 inline-block text-[15px] text-accent group-hover:text-accent-hover transition-colors">
            Open iPhone/iPad docs &rarr;
          </span>
        </Link>

        <Link
          href="/docs/mac/getting-started"
          className="group rounded-xl border border-border bg-bg-surface p-8 transition-colors hover:border-border-hover"
        >
          <h2 className="text-2xl font-semibold text-text-primary">Mac</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
            Install guide and troubleshooting for macOS builds, plus shared
            settings reference.
          </p>
          <span className="mt-4 inline-block text-[15px] text-accent group-hover:text-accent-hover transition-colors">
            Open Mac docs &rarr;
          </span>
        </Link>
      </div>
    </div>
  );
}
