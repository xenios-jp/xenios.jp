import type { Metadata } from "next";
import Link from "next/link";
import {
  BUILD_VERSION,
  BUILD_COMMIT,
  BUILD_DATE,
  EMULATOR_GITHUB_RELEASES_URL,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Download",
  description: "Download XeniOS for Mac.",
};

export default function DownloadMacPage() {
  return (
    <>
      <section className="hero-gradient border-b border-border pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Download
          </h1>
          <p className="mt-2 text-lg text-text-secondary">XeniOS for Mac.</p>
        </div>
      </section>

      <section className="py-4 border-b border-border bg-bg-surface/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-border bg-bg-surface p-1">
              <Link
                href="/download/ios"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                iPhone / iPad
              </Link>
              <Link
                href="/download/mac"
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg"
              >
                Mac
              </Link>
            </div>
            <p className="text-sm text-text-secondary">
              One codebase, two builds: iPhone/iPad and Mac.
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 border-b border-border bg-bg-surface/20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-xl border border-border bg-bg-surface p-6">
            <h2 className="text-xl font-semibold text-text-primary">
              Mac install steps
            </h2>
            <ol className="mt-4 space-y-2 text-[15px] leading-relaxed text-text-primary list-decimal pl-5">
              <li>Open the GitHub releases page.</li>
              <li>Download the latest macOS build asset.</li>
              <li>
                If a{" "}
                <code className="font-mono text-xs bg-bg-surface-2 px-1.5 py-0.5 rounded">
                  .dmg
                </code>{" "}
                is provided, open it and drag the app to Applications.
              </li>
              <li>
                If macOS blocks first launch, right-click the app and choose{" "}
                <strong>Open</strong> once to approve it.
              </li>
              <li>Add your legally dumped game files and launch.</li>
            </ol>
            <div className="mt-6">
              <a
                href={EMULATOR_GITHUB_RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-accent hover:bg-accent-hover text-accent-fg font-medium px-8 py-3.5 rounded-lg transition-colors text-[15px]"
              >
                Open Releases
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
            Mac notes
          </h2>
          <ul className="space-y-3 text-[15px] leading-relaxed text-text-primary">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>Intel and Apple Silicon (M-series) Macs are supported.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>
                Performance and compatibility are still in progress and not
                fully validated yet.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>No games are included. Use only game dumps you legally own.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="pb-12 md:pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="border border-border bg-bg-surface rounded-xl p-8">
            <h3 className="text-lg font-bold text-text-primary mb-4">
              Build Metadata
            </h3>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[15px] font-mono">
              <div>
                <dt className="text-text-muted">Version</dt>
                <dd className="mt-1 text-text-primary">{BUILD_VERSION}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Commit</dt>
                <dd className="mt-1 text-text-primary">{BUILD_COMMIT}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Date</dt>
                <dd className="mt-1 text-text-primary">{BUILD_DATE}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Artifacts</dt>
                <dd className="mt-1 text-text-primary">iOS + macOS</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}

