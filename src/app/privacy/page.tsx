import type { Metadata } from "next";
import {
  WEBSITE_GITHUB_URL,
  EMULATOR_GITHUB_URL,
  XENIA_UPSTREAM_REPO_URL,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Privacy policy for the XeniOS website and related community resources.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <section className="hero-gradient border-b border-border pt-16 pb-12 md:pt-20 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Privacy
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            What we collect, how we use it, and what we keep.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <section className="rounded-xl border border-border bg-bg-surface p-6 md:p-8">
          <h2 className="text-lg font-semibold text-text-primary">
            Data collected by this website
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            XeniOS&apos;s website is built with Next.js and includes server-rendered
            pages for content such as credits and license data. We do not require
            account creation, authentication, or profile management.
          </p>
          <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-text-secondary">
            <li>• No names, emails, passwords, or payment details are submitted.</li>
            <li>
              • No user-uploaded files are processed by the website.
            </li>
            <li>• The site does not sell or trade personal data.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-bg-surface p-6 md:p-8">
          <h2 className="text-lg font-semibold text-text-primary">
            Browser-side storage
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            A theme preference is stored locally in your browser via the embedded
            theme utility so your preferred dark/light mode is remembered on this
            device. This preference is not used to identify you.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-bg-surface p-6 md:p-8">
          <h2 className="text-lg font-semibold text-text-primary">
            Third-party services
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            This website links to external services such as GitHub and Discord and
            fetches public repository metadata from GitHub APIs. Those services
            are governed by their own privacy policies.
          </p>
          <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-text-secondary">
            <li>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                href="https://discord.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                Discord
              </a>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-bg-surface p-6 md:p-8">
          <h2 className="text-lg font-semibold text-text-primary">
            Compliance statement
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            If you need clarification on any privacy-related process used by
            upstream repositories, please consult their repository documentation.
          </p>
          <div className="mt-4 grid gap-2 text-[15px] text-text-secondary">
            <a
              href={WEBSITE_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              Website repository: {WEBSITE_GITHUB_URL}
            </a>
            <a
              href={EMULATOR_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              Emulator repository: {EMULATOR_GITHUB_URL}
            </a>
            <a
              href={XENIA_UPSTREAM_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              Upstream org: {XENIA_UPSTREAM_REPO_URL}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
