import Link from "next/link";
import { StateStrip } from "@/components/state-strip";
import { Pill } from "@/components/pill";
import { HeroTitle } from "@/components/hero-title";
import { BUILD_VERSION, BUILD_DATE } from "@/lib/constants";
import { getAllGames, type GameStatus } from "@/lib/compatibility";

const STATUS_LABELS: Record<GameStatus, string> = {
  playable: "Playable",
  ingame: "In-Game",
  intro: "Intro",
  loads: "Loads",
  nothing: "Nothing",
};

function gameUpdatedAtMs(updatedAt: string): number {
  const timestamp = new Date(updatedAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export default function Home() {
  const compatibilityPreview = [...getAllGames()]
    .sort((a, b) => gameUpdatedAtMs(b.updatedAt) - gameUpdatedAtMs(a.updatedAt))
    .slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="hero-gradient-home pt-28 pb-12 md:pt-32 md:pb-14 border-b border-border">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <HeroTitle />
          <p className="hero-fade-1 mt-4 text-2xl text-text-secondary">
            Xbox 360 emulation on iPhone, iPad, and Mac. Early alpha.
          </p>
          <p className="hero-fade-1 mt-3 text-[15px] leading-relaxed text-text-muted">
            Not in the App Store. iPhone/iPad installs use sideloading; Mac uses
            a standard app install.
          </p>
          <div className="hero-fade-2 mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/download/ios"
              className="bg-accent hover:bg-accent-hover text-accent-fg font-medium w-56 text-center py-4 rounded-lg text-base transition-colors"
            >
              Get for iPhone / iPad
            </Link>
            <Link
              href="/download/mac"
              className="border border-border text-text-primary hover:bg-bg-surface-2 w-56 text-center py-4 rounded-lg text-base transition-colors"
            >
              Get for Mac
            </Link>
          </div>
          <div className="hero-fade-2 mt-4">
            <Link
              href="/compatibility"
              className="text-base text-accent hover:text-accent-hover transition-colors"
            >
              Check game compatibility first &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* State Strip */}
      <StateStrip
        items={[
          { label: "Build", value: BUILD_VERSION },
          { label: BUILD_DATE },
          { label: "iPhone/iPad build" },
          { label: "Mac build (Intel + M-series)" },
        ]}
      />

      {/* Get Started */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
            Choose Your Path
          </h2>
          <p className="mt-2 text-text-secondary text-lg leading-relaxed">
            Pick the platform you&apos;re using and follow that guide.
          </p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            <Link
              href="/download/ios"
              className="group border border-border bg-bg-surface rounded-xl p-6 transition-colors hover:border-border-hover"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-accent">
                iPhone / iPad
              </div>
              <div className="mt-2">
                <h3 className="text-text-primary font-semibold text-xl">Setup Guide</h3>
              </div>
              <p className="mt-3 text-text-secondary text-base leading-relaxed">
                Install the IPA with AltStore/SideStore/TrollStore, then enable
                JIT before launching games.
              </p>
              <span className="mt-3 inline-block text-base text-accent group-hover:text-accent-hover transition-colors">
                Open iPhone/iPad guide &rarr;
              </span>
            </Link>

            <Link
              href="/download/mac"
              className="group border border-border bg-bg-surface rounded-xl p-6 transition-colors hover:border-border-hover"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-accent">
                Mac
              </div>
              <div className="mt-2">
                <h3 className="text-text-primary font-semibold text-xl">Setup Guide</h3>
              </div>
              <p className="mt-3 text-text-secondary text-base leading-relaxed">
                Download the latest macOS build and install it like a standard
                Mac app.
              </p>
              <span className="mt-3 inline-block text-base text-accent group-hover:text-accent-hover transition-colors">
                Open Mac guide &rarr;
              </span>
            </Link>

            <Link
              href="/docs"
              className="group border border-border bg-bg-surface rounded-xl p-6 transition-colors hover:border-border-hover"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-accent">
                All Platforms
              </div>
              <div className="mt-2">
                <h3 className="text-text-primary font-semibold text-xl">Docs and FAQ</h3>
              </div>
              <p className="mt-3 text-text-secondary text-base leading-relaxed">
                Read platform-specific docs and FAQ to understand setup,
                controls, and troubleshooting.
              </p>
              <span className="mt-3 inline-block text-base text-accent group-hover:text-accent-hover transition-colors">
                Open docs &rarr;
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Compatibility Teaser */}
      <section className="py-12 md:py-16 border-t border-border">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
            Compatibility
          </h2>
          <p className="mt-2 text-text-secondary text-lg leading-relaxed">
            Community-reported and device-specific. The same game can behave
            differently on iPhone, iPad, and Mac.
          </p>
          <div className="mt-6 relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-base">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-text-secondary font-medium">Title</th>
                    <th className="pb-3 text-text-secondary font-medium">Status</th>
                    <th className="pb-3 text-text-secondary font-medium">Tested On</th>
                  </tr>
                </thead>
                <tbody>
                  {compatibilityPreview.map((game) => (
                    <tr
                      key={game.slug}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 text-text-primary">
                        <Link
                          href={`/compatibility/${game.slug}`}
                          className="transition hover:text-accent"
                        >
                          {game.title}
                        </Link>
                      </td>
                      <td className="py-3">
                        <Pill variant={game.status}>
                          {STATUS_LABELS[game.status]}
                        </Pill>
                      </td>
                      <td className="py-3 text-text-secondary">{game.lastReport.device}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg-primary to-transparent md:hidden" />
          </div>
          <div className="mt-6">
            <Link
              href="/compatibility"
              className="text-base text-accent hover:text-accent-hover transition-colors"
            >
              Browse full database &rarr;
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
