import type { Metadata } from "next";
import Link from "next/link";
import { XENIA_REPOS_FOR_CREDITS } from "@/lib/constants";
import { getXeniaContributors } from "@/lib/credits";

export const metadata: Metadata = {
  title: "Credits",
  description:
    "Contributor credits for upstream Xenia repositories that underpin XeniOS.",
};

export default async function CreditsPage() {
  const { contributors, totalProjects, errors } = await getXeniaContributors();

  return (
    <div className="min-h-screen bg-bg-primary">
      <section className="hero-gradient border-b border-border pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Credits
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            Attribution for upstream contributors across the Xenia project line.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <section className="rounded-xl border border-border bg-bg-surface p-6 md:p-8">
          <h2 className="text-lg font-semibold text-text-primary">
            Included upstream repositories
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            This page combines contributor data from the following repositories.
            Contributors appear once and list all projects they contributed to.
          </p>
          <ul className="mt-4 space-y-2 text-[15px] text-text-secondary">
            {XENIA_REPOS_FOR_CREDITS.map((repo) => (
              <li key={repo.slug} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2 hover:text-accent-hover"
                >
                  {repo.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-text-muted">
            Total repositories indexed: {totalProjects}
          </p>
        </section>

        {errors.length > 0 ? (
          <section className="rounded-xl border border-red-300/30 bg-red-500/10 p-6 md:p-8">
            <h2 className="text-lg font-semibold text-text-primary">
              Data fetch warnings
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Some contributor endpoints failed to load. The list may be
              incomplete.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              {errors.map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-xl border border-border bg-bg-surface p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text-primary">
              Aggregated contributors
            </h2>
            <p className="text-sm text-text-muted">
              {contributors.length} unique contributors
            </p>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Duplicate contributor identities are merged into one row per
            contributor across all listed repositories.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-text-muted">
                  <th className="sticky left-0 z-10 border-b border-border bg-bg-surface px-3 py-2 text-left font-medium">
                    Contributor
                  </th>
                  <th className="border-b border-border bg-bg-surface px-3 py-2 text-left font-medium">
                    Projects
                  </th>
                </tr>
              </thead>
              <tbody>
                {contributors.map((contributor) => {
                  const orderedProjects = XENIA_REPOS_FOR_CREDITS.map(
                    ({ label }) => label
                  ).filter((label) => contributor.projects.includes(label));

                  return (
                    <tr
                      key={contributor.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="sticky left-0 z-10 border-b border-border/60 bg-bg-surface px-3 py-3">
                        <div className="flex items-center gap-2">
                          {contributor.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={contributor.avatarUrl}
                              alt={`${contributor.displayName} avatar`}
                              className="h-7 w-7 rounded-full"
                              loading="lazy"
                            />
                          ) : null}
                          <a
                            href={contributor.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text-primary hover:text-accent"
                          >
                            {contributor.displayName}
                          </a>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-text-secondary">
                        {orderedProjects.join(", ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-bg-surface p-6 md:p-8">
          <h2 className="text-lg font-semibold text-text-primary">
            Additional attribution
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Notable documentation and community resources may include non-code
            contributors. For complete legal and credit details of those materials,
            see the repository history and release notes for each project.
          </p>
          <div className="mt-4">
            <Link
              href="/legal"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              See legal details
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
