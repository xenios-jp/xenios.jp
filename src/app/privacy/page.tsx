import type { Metadata } from "next";
import {
  EMULATOR_GITHUB_URL,
  XENIA_UPSTREAM_REPO_URL,
} from "@/lib/constants";
import { withCanonical } from "@/lib/metadata";

export const metadata: Metadata = withCanonical(
  {
    title: "Privacy",
    description:
      "Privacy policy for the XeniOS website, the XeniOS app's crash reports and performance statistics, and related community resources.",
  },
  "/privacy"
);

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <section className="hero-gradient border-b border-border pt-20 pb-12 md:pb-14">
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

        <section
          id="app-diagnostics"
          className="scroll-mt-24 rounded-xl border border-border bg-bg-surface p-6 md:p-8"
        >
          <h2 className="text-lg font-semibold text-text-primary">
            Crash reports and performance statistics in the XeniOS app
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            The XeniOS app can send anonymous crash reports and performance
            statistics to help fix problems. It tells you before it sends
            anything, and sends them only while both Online Features and Share
            Diagnostics are on (Settings &gt; About &gt; Privacy). You can turn
            off Share Diagnostics on its own, or choose Don&apos;t Send
            Diagnostics when the app first asks: update checks, compatibility
            data and the other online features keep working.
          </p>

          <h3 className="mt-6 text-[15px] font-semibold text-text-primary">
            What is sent
          </h3>
          <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-text-secondary">
            <li>• Your device model, iOS version and XeniOS version.</li>
            <li>
              • For each game session: the game&apos;s title ID, frame rate,
              load time, shader compiles, GPU errors, time at each temperature
              state and in Low Power Mode, memory use, display settings, and
              how the session ended.
            </li>
            <li>
              • For a crash: the call stack (code locations in XeniOS and in
              system libraries), the faulting address, the game&apos;s title
              ID, and the error message or the reason iOS gave for ending the
              app, with file paths, file names and quoted text removed.
            </li>
          </ul>

          <h3 className="mt-6 text-[15px] font-semibold text-text-primary">
            What is never sent
          </h3>
          <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-text-secondary">
            <li>• Your files, file names or game files.</li>
            <li>
              • Your name, Apple Account, email address, contacts or location.
            </li>
            <li>• A device, install or advertising identifier.</li>
            <li>• Logs, unless you share one yourself.</li>
          </ul>

          <h3 className="mt-6 text-[15px] font-semibold text-text-primary">
            How reports are handled
          </h3>
          <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-text-secondary">
            <li>
              • Reports wait on your device until they are sent. Settings &gt;
              About &gt; Pending Reports shows them as they will be sent, and
              turning either switch off deletes them.
            </li>
            <li>
              • They go to the XeniOS diagnostics server, which runs on{" "}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                Cloudflare
              </a>
              . The server doesn&apos;t store your IP address; it uses it only
              to limit how often reports can be sent.
            </li>
            <li>
              • Individual reports are deleted after 90 days. Daily totals per
              game, device type and XeniOS version, and groups of similar
              crashes, are kept longer; they hold nothing about any one person.
            </li>
            <li>
              • Only XeniOS maintainers can see reports. Crash groups may be
              tracked as issues in a private GitHub repository, with their
              counts, XeniOS versions, title IDs and device models.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-bg-surface p-6 md:p-8">
          <h2 className="text-lg font-semibold text-text-primary">
            Third-party services
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            This website links to external services such as GitHub and Discord
            and may display public repository metadata derived from those
            services. Those services are governed by their own privacy policies.
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
            the project or upstream repositories, please consult their
            repository documentation.
          </p>
          <div className="mt-4 grid gap-2 text-[15px] text-text-secondary">
            <a
              href={EMULATOR_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              XeniOS repository: {EMULATOR_GITHUB_URL}
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
