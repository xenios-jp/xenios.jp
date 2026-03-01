import type { Metadata } from "next";
import Link from "next/link";
import {
  BUILD_VERSION,
  BUILD_COMMIT,
  BUILD_DATE,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Download XeniOS and start playing Xbox 360 games on your iPhone or iPad.",
};

export default function DownloadPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero-gradient border-b border-border pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Download
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            XeniOS for iPhone and iPad.
          </p>
        </div>
      </section>

      {/* Platform Switch */}
      <section className="py-4 border-b border-border bg-bg-surface/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-border bg-bg-surface p-1">
              <Link
                href="/download/ios"
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg"
              >
                iPhone / iPad
              </Link>
              <Link
                href="/download/mac"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
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

      {/* Important Runtime Requirement */}
      <section className="py-6 border-b border-border bg-amber-500/5">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-5">
            <h2 className="text-base font-semibold text-text-primary">
              Read first: required to run games
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-text-primary">
              Installing the app and running games are two different steps.
              XeniOS can install successfully but still fail to launch games
              until JIT is enabled.
            </p>
            <ol className="mt-3 space-y-2 text-[15px] leading-relaxed text-text-primary list-decimal pl-5">
              <li>Install XeniOS using one of the methods below.</li>
              <li>
                Enable JIT with <strong>StikDebug</strong>,{" "}
                <strong>SideJITServer</strong>, or <strong>AltJIT</strong>.
              </li>
              <li>
                On newer devices (especially <strong>iPhone 14+</strong> and
                modern iPads), also install and enable{" "}
                <strong>LocalDevVPN</strong>. Quick device guide:{" "}
                <strong>iPhone 14+</strong>,{" "}
                <strong>iPad mini (6th gen)+</strong>,{" "}
                <strong>iPad (10th gen)+</strong>,{" "}
                <strong>iPad Air (5th gen/M1)+</strong>, and{" "}
                <strong>iPad Pro (M1)+</strong>.
              </li>
              <li>
                Not sure which device you have? Open{" "}
                <strong>Settings &rarr; General &rarr; About</strong> to check
                your model. If unsure, install LocalDevVPN anyway (safe
                default).
              </li>
            </ol>
            <p className="mt-3 text-[14px] text-text-secondary">
              Plain English: JIT is the permission the emulator needs to execute
              translated game code. Without it, games won&apos;t start.
              Need help? See{" "}
              <Link
                href="/docs/ios/getting-started"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                Getting Started
              </Link>{" "}
              and{" "}
              <Link
                href="/docs/ios/troubleshooting"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                Troubleshooting
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Recommended Method */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="border border-accent/20 bg-bg-surface rounded-xl p-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full bg-accent-muted text-accent">
                Recommended
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
              AltStore / SideStore
            </h2>
            <p className="mt-3 text-text-secondary text-[15px] leading-relaxed max-w-2xl">
              AltStore and SideStore provide the simplest sideloading experience
              on iOS. Apps are automatically re-signed before they expire, so
              XeniOS stays installed without hassle.
            </p>
            <ol className="mt-8 space-y-3 text-[15px] leading-relaxed text-text-primary">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg text-xs font-bold">
                  1
                </span>
                <span>
                  Install{" "}
                  <a
                    href="https://altstore.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
                  >
                    AltStore
                  </a>{" "}
                  or{" "}
                  <a
                    href="https://sidestore.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
                  >
                    SideStore
                  </a>{" "}
                  on your device.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg text-xs font-bold">
                  2
                </span>
                <span>
                  <code className="font-mono text-xs bg-bg-surface-2 px-1.5 py-0.5 rounded">.ipa</code> release is coming soon.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg text-xs font-bold">
                  3
                </span>
                <span>Open the .ipa file with AltStore/SideStore to install.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg text-xs font-bold">
                  4
                </span>
                <span>Trust the developer certificate in Settings &rarr; General &rarr; VPN &amp; Device Management.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg text-xs font-bold">
                  5
                </span>
                <span>Complete JIT setup (see the &ldquo;Read first&rdquo; box above), then launch a game.</span>
              </li>
            </ol>
            <div className="mt-10">
              <span className="inline-flex items-center rounded-lg bg-accent px-8 py-3.5 text-[15px] font-medium text-accent-fg opacity-70">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Other Methods */}
      <section className="pb-12 md:pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TrollStore */}
            <div className="border border-border bg-bg-surface rounded-xl p-8">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full bg-accent-muted text-accent">
                  Permanent
                </span>
              </div>
              <h3 className="text-lg font-bold text-text-primary">TrollStore</h3>
              <p className="mt-3 text-text-secondary text-[15px] leading-relaxed">
                TrollStore allows permanent app installation without re-signing.
                Available on select iOS versions with a compatible exploit.
              </p>
              <ol className="mt-5 space-y-2.5 text-[15px] leading-relaxed text-text-primary">
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-surface-2 text-text-secondary text-xs font-medium">
                    1
                  </span>
                  <span>
                    Install{" "}
                    <a
                      href="https://github.com/opa334/TrollStore"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline decoration-blue-400/30 underline-offset-2 hover:decoration-blue-400"
                    >
                      TrollStore
                    </a>{" "}
                    on a supported iOS version.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-surface-2 text-text-secondary text-xs font-medium">
                    2
                  </span>
                  <span>IPA release is coming soon.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-surface-2 text-text-secondary text-xs font-medium">
                    3
                  </span>
                  <span>Open the .ipa with TrollStore to install permanently.</span>
                </li>
              </ol>
              <div className="mt-8">
                <span className="inline-flex items-center rounded-lg border border-border px-8 py-3.5 text-[15px] text-text-primary opacity-70">
                  Coming Soon
                </span>
              </div>
            </div>

            {/* Direct Sideload */}
            <div className="border border-border bg-bg-surface rounded-xl p-8">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full bg-bg-surface-2 text-text-secondary">
                  Advanced
                </span>
              </div>
              <h3 className="text-lg font-bold text-text-primary">
                Direct Sideload
              </h3>
              <p className="mt-3 text-text-secondary text-[15px] leading-relaxed">
                Manually sign and install the .ipa using a tool like
                Xcode, iOS App Signer, or a signing service. Requires an Apple
                Developer account or free provisioning profile.
              </p>
              <ol className="mt-5 space-y-2.5 text-[15px] leading-relaxed text-text-primary">
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-surface-2 text-text-secondary text-xs font-medium">
                    1
                  </span>
                  <span>IPA release is coming soon.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-surface-2 text-text-secondary text-xs font-medium">
                    2
                  </span>
                  <span>Sign the .ipa with your developer certificate or provisioning profile.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-surface-2 text-text-secondary text-xs font-medium">
                    3
                  </span>
                  <span>Install via Xcode, Apple Configurator, or your preferred method.</span>
                </li>
              </ol>
              <div className="mt-8">
                <span className="inline-flex items-center rounded-lg border border-border px-8 py-3.5 text-[15px] text-text-primary opacity-70">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Build Metadata */}
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
                <dt className="text-text-muted">Size</dt>
                <dd className="mt-1 text-text-primary">N/A</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="pb-12 md:pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-8">
            Requirements
          </h2>
          <ul className="space-y-3 text-[15px] leading-relaxed text-text-primary">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>iOS 17 or later</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>A14 chip minimum (A16+ recommended for best performance)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>6 MB free storage + additional space for game files</span>
            </li>
          </ul>
          <p className="mt-8 text-[15px] leading-relaxed text-text-muted border-l-2 border-border pl-4">
            No games are included. You must dump games from Xbox 360 discs or
            digital purchases that you legally own. Piracy is not supported.
          </p>
        </div>
      </section>

      {/* Disclaimers */}
      <section className="pb-12 md:pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="border-t border-border pt-8">
            <p className="text-sm text-text-muted max-w-3xl">
              Xbox, Xbox 360, and related logos are trademarks of Microsoft
              Corporation. XeniOS is currently based on Xenia-Edge
              (has207/xenia-edge) in the Xenia codebase lineage. It is not
              affiliated with or endorsed by Microsoft. This project does not
              condone or support piracy. Users are responsible for ensuring
              they have the legal right to use any game files with this
              software.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
