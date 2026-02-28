import type { Metadata } from "next";
import Link from "next/link";
import { Accordion } from "@/components/accordion";
import { EMULATOR_GITHUB_ISSUES_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about XeniOS for Mac.",
};

const macItems = [
  {
    title: "What is XeniOS for Mac?",
    content: (
      <p>
        XeniOS for Mac is the macOS build distributed from the same XeniOS
        project and repository as the iPhone/iPad build.
      </p>
    ),
  },
  {
    title: "Is Mac support a separate project?",
    content: (
      <p>
        No. Mac and iPhone/iPad releases are built from one shared codebase.
        Platform-specific code is only where needed.
      </p>
    ),
  },
  {
    title: "How do I install on Mac?",
    content: (
      <p>
        Go to the releases page, download the latest macOS asset, open it, then
        move the app to Applications. If first launch is blocked, right-click
        the app and choose Open once.
      </p>
    ),
  },
  {
    title: "Which Macs are supported?",
    content: <p>Both Intel Macs and Apple Silicon (M-series) Macs are supported.</p>,
  },
  {
    title: "Are compatibility and performance guaranteed?",
    content: (
      <p>
        No. Current Mac results vary by game, scene, and hardware. Treat
        compatibility and FPS as in-progress until broader validation is
        published.
      </p>
    ),
  },
  {
    title: "Can I use Xbox Live services?",
    content: (
      <p>
        Xbox Live is not an officially supported feature. Networking plumbing
        exists in the emulator stack, but sign-in and service behavior remain
        unverified.
      </p>
    ),
  },
  {
    title: "Where do I report issues?",
    content: (
      <p>
        Open an issue on{" "}
        <a
          href={EMULATOR_GITHUB_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
        >
          GitHub
        </a>{" "}
        and include your Mac model, macOS version, build version, game title,
        and steps to reproduce.
      </p>
    ),
  },
];

export default function MacFAQPage() {
  return (
    <div>
      <section className="hero-gradient border-b border-border pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            FAQ
          </h1>
          <p className="mt-2 text-lg text-text-secondary">XeniOS for Mac.</p>
        </div>
      </section>

      <section className="py-4 border-b border-border bg-bg-surface/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-border bg-bg-surface p-1">
              <Link
                href="/faq/ios"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                iPhone / iPad
              </Link>
              <Link
                href="/faq/mac"
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

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold text-text-primary">Mac</h2>
          <div className="mt-3">
            <Accordion items={macItems} />
          </div>
        </div>
      </div>
    </div>
  );
}

