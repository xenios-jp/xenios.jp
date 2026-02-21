import type { Metadata } from "next";
import Link from "next/link";
import {
  XENIA_UPSTREAM_REPO_URL,
  XENIA_UPSTREAM_LICENSE_URL,
  XENIA_UPSTREAM_LICENSE_TEXT_URL,
  EMULATOR_GITHUB_URL,
  WEBSITE_GITHUB_URL,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Legal",
  description:
    "Legal and compliance notes for XeniOS, including license inheritance and project attribution.",
};

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <section className="hero-gradient border-b border-border pt-16 pb-12 md:pt-20 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Legal
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            Legal terms for the XeniOS website and project.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-8">
          <section className="rounded-xl border border-border bg-bg-surface p-6 md:p-8">
            <h2 className="text-xl font-semibold text-text-primary">
              License
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
              XeniOS follows the upstream Xenia project&rsquo;s open-source
              license. This means the rights, permissions, and obligations are
              the same as the parent project.
            </p>
            <div className="mt-4 space-y-2 text-sm text-text-muted">
              <p>
                <strong className="text-text-primary">License source:</strong>{" "}
                <a
                  href={XENIA_UPSTREAM_LICENSE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2 hover:text-accent-hover"
                >
                  Xenia project LICENSE
                </a>
              </p>
              <p>
                <strong className="text-text-primary">Raw license text:</strong>{" "}
                <a
                  href={XENIA_UPSTREAM_LICENSE_TEXT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2 hover:text-accent-hover"
                >
                  View raw LICENSE file
                </a>
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-bg-surface p-6 md:p-8">
            <h2 className="text-xl font-semibold text-text-primary">
              Attribution
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
              XeniOS is built on the Xenia emulation codebase lineage and is
              provided without endorsement from Microsoft.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
              For contributor and credit details, see the{" "}
              <Link
                href="/credits"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                credits page
              </Link>
              .
            </p>
          </section>

          <section className="rounded-xl border border-border bg-bg-surface p-6 md:p-8">
            <h2 className="text-xl font-semibold text-text-primary">
              Repository references
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
              The website and emulator repositories are:
            </p>
            <ul className="mt-3 space-y-1.5 text-[15px] leading-relaxed text-text-secondary">
              <li>
                Site:&nbsp;
                <a
                  href={WEBSITE_GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2 hover:text-accent-hover"
                >
                  https://github.com/xenios-jp/xenios.jp
                </a>
              </li>
              <li>
                Emulator:&nbsp;
                <a
                  href={EMULATOR_GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2 hover:text-accent-hover"
                >
                  https://github.com/xenios-jp/XeniOS
                </a>
              </li>
              <li>
                Upstream project:&nbsp;
                <a
                  href={XENIA_UPSTREAM_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2 hover:text-accent-hover"
                >
                  https://github.com/xenia-project
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
