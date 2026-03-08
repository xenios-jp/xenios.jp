import Link from "next/link";
import { StateStrip } from "@/components/state-strip";
import { Pill } from "@/components/pill";
import { HeroTitle } from "@/components/hero-title";
import { getBuildDisplayLabel, getLatestBuild } from "@/lib/builds";
import {
  deviceName,
  getActiveSummary,
  getAllGames,
  getStatusLabel,
} from "@/lib/compatibility";
import {
  DISCORD_URL,
  XENIA_CANARY_RELEASES_URL,
  XENIA_EDGE_RELEASES_URL,
} from "@/lib/constants";

function gameUpdatedAtMs(updatedAt: string | undefined): number {
  const timestamp = new Date(updatedAt ?? "").getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export default function Home() {
  const iosRelease = getLatestBuild("ios", "release");
  const macRelease = getLatestBuild("macos", "release");
  const previewBuild =
    getLatestBuild("ios", "preview") ?? getLatestBuild("macos", "preview");

  const compatibilityPreview = [...getAllGames()]
    .sort(
      (a, b) =>
        gameUpdatedAtMs(getActiveSummary(b, "release").updatedAt) -
        gameUpdatedAtMs(getActiveSummary(a, "release").updatedAt),
    )
    .slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="hero-gradient-home pt-28 pb-12 md:pt-32 md:pb-14 border-b border-border">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <HeroTitle />
          <p className="hero-fade-1 mt-4 text-2xl text-text-secondary">
            Xbox 360 emulation on iPhone, iPad, and Mac.
          </p>
          <div className="hero-fade-1 mx-auto mt-4 max-w-2xl rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-[15px] leading-relaxed text-text-primary">
            XeniOS is still alpha software. Expect crashes, missing features,
            and major game-to-game variance. Do not expect a polished or
            perfect experience yet.
          </div>
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
          <div className="hero-fade-2 mt-4 flex flex-col items-center gap-2">
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
          {
            label: "Public release",
            value: iosRelease ? getBuildDisplayLabel(iosRelease) : "No manifest",
          },
          {
            label: "Preview",
            value: previewBuild ? getBuildDisplayLabel(previewBuild) : "Not published",
          },
          {
            label: "iPhone/iPad",
            value: iosRelease ? getBuildDisplayLabel(iosRelease) : "Not published",
          },
          {
            label: "Mac",
            value: macRelease ? getBuildDisplayLabel(macRelease) : "Not published",
          },
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
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Need setup or JIT help? Join{" "}
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              Discord
            </a>
            .
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
                Install the IPA with SideStore, then enable JIT before
                launching games.
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
                Choose the Apple Silicon or Intel download that matches your
                Mac, then install it like a standard Mac app.
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

          <div className="mt-6 rounded-xl border border-border bg-bg-surface p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-text-primary">
                  Looking for Windows or Linux builds?
                </h3>
                <p className="mt-2 max-w-2xl text-base leading-relaxed text-text-secondary">
                  XeniOS currently focuses on iPhone, iPad, and Mac, while also
                  carrying platform changes that benefit ARM64 Windows, Linux,
                  and Android. For Windows use Xenia-Canary as the stable path.
                  For Linux, Xenia-Edge currently has better support.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href={XENIA_CANARY_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-w-[220px] flex-col rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-5 py-4 text-left transition-colors hover:bg-emerald-500/15"
                >
                  <span className="inline-flex w-fit items-center rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                    Stable
                  </span>
                  <span className="mt-3 text-base font-semibold text-text-primary">
                    Open Xenia-Canary
                  </span>
                  <span className="mt-1 text-sm leading-relaxed text-text-secondary">
                    Stable desktop branch and the safer default for Windows.
                  </span>
                </a>
                <a
                  href={XENIA_EDGE_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-w-[220px] flex-col rounded-xl border border-amber-400/25 bg-amber-500/10 px-5 py-4 text-left transition-colors hover:bg-amber-500/15"
                >
                  <span className="inline-flex w-fit items-center rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                    Experimental
                  </span>
                  <span className="mt-3 text-base font-semibold text-text-primary">
                    Open Xenia-Edge
                  </span>
                  <span className="mt-1 text-sm leading-relaxed text-text-secondary">
                    Faster-moving branch with better Linux support and more churn.
                  </span>
                </a>
              </div>
            </div>
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
                    <th className="pb-3 pr-4 text-text-secondary font-medium">Title</th>
                    <th className="pb-3 pr-4 text-text-secondary font-medium">Status</th>
                    <th className="hidden pb-3 text-text-secondary font-medium sm:table-cell">Tested On</th>
                  </tr>
                </thead>
                <tbody>
                  {compatibilityPreview.map((game) => (
                    <tr key={game.slug} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 text-text-primary">
                        <Link
                          href={`/compatibility/${game.slug}`}
                          className="transition hover:text-accent"
                        >
                          {game.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <Pill variant={getActiveSummary(game, "release").status}>
                          {getStatusLabel(getActiveSummary(game, "release").status)}
                        </Pill>
                      </td>
                      <td className="hidden py-3 text-text-secondary sm:table-cell">
                        {getActiveSummary(game, "release").lastReport
                          ? deviceName(getActiveSummary(game, "release").lastReport!.device)
                          : "Awaiting release report"}
                      </td>
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
