import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions for XeniOS on iPhone, iPad, and Mac.",
};

export default function FAQPickerPage() {
  return (
    <div>
      <section className="hero-gradient border-b border-border pt-16 pb-12 md:pt-20 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            FAQ
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            Choose your device to get the right answers.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <p className="mb-6 text-[15px] leading-relaxed text-text-secondary">
          Pick your platform to avoid mixed instructions. iPhone/iPad and Mac
          setup details are intentionally separated.
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link
            href="/faq/ios"
            className="group rounded-xl border border-border bg-bg-surface p-8 transition-colors hover:border-border-hover"
          >
            <h2 className="text-2xl font-semibold text-text-primary">
              iPhone / iPad
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
              Installation, JIT setup, supported devices, controllers, and
              common iOS issues.
            </p>
            <span className="mt-4 inline-block text-[15px] text-accent group-hover:text-accent-hover transition-colors">
              Open iPhone/iPad FAQ &rarr;
            </span>
          </Link>

          <Link
            href="/faq/mac"
            className="group rounded-xl border border-border bg-bg-surface p-8 transition-colors hover:border-border-hover"
          >
            <h2 className="text-2xl font-semibold text-text-primary">Mac</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
              Install steps, Intel/M-series support, and Mac-specific
              troubleshooting.
            </p>
            <span className="mt-4 inline-block text-[15px] text-accent group-hover:text-accent-hover transition-colors">
              Open Mac FAQ &rarr;
            </span>
          </Link>
        </div>

        <p className="mt-8 text-sm text-text-muted">
          XeniOS is one project with two Apple platform builds (iPhone/iPad and
          Mac).
        </p>
      </div>
    </div>
  );
}
