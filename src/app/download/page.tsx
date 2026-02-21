import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Download",
  description: "Download XeniOS for iPhone, iPad, or Mac.",
};

export default function DownloadPickerPage() {
  return (
    <>
      <section className="hero-gradient border-b border-border pt-16 pb-12 md:pt-20 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Download
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            Choose your device to get the right install steps.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-6 text-[15px] leading-relaxed text-text-secondary">
            If you&apos;re on iPhone or iPad, start with sideload install steps.
            If you&apos;re on Mac, start with the macOS build.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Link
              href="/download/ios"
              className="group rounded-xl border border-border bg-bg-surface p-8 transition-colors hover:border-border-hover"
            >
              <h2 className="text-2xl font-semibold text-text-primary">
                iPhone / iPad
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
                Not an App Store install. Use the IPA sideload steps, then
                enable JIT so games can run.
              </p>
              <span className="mt-4 inline-block text-[15px] text-accent group-hover:text-accent-hover transition-colors">
                Download for iPhone/iPad &rarr;
              </span>
            </Link>

            <Link
              href="/download/mac"
              className="group rounded-xl border border-border bg-bg-surface p-8 transition-colors hover:border-border-hover"
            >
              <h2 className="text-2xl font-semibold text-text-primary">Mac</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
                Download the macOS build from Releases and install it like a
                normal Mac app (Intel and Apple Silicon supported).
              </p>
              <span className="mt-4 inline-block text-[15px] text-accent group-hover:text-accent-hover transition-colors">
                Download for Mac &rarr;
              </span>
            </Link>
          </div>

          <p className="mt-8 text-sm text-text-muted">
            XeniOS is one project with two Apple platform builds (iPhone/iPad
            and Mac). No games are included.
          </p>
        </div>
      </section>
    </>
  );
}
