import Script from "next/script";
import { notFound } from "next/navigation";
import { getStatusLabel } from "@/lib/compatibility";
import {
  getCompatibilityGameBySlug,
  getCompatibilityGames,
  getGameDetailViewModel,
  selectPrimaryReleaseCard,
} from "@/lib/game-detail";
import { withCanonical } from "@/lib/metadata";
import { SITE_URL } from "@/lib/constants";
import { GameDetailClient } from "./game-detail-client";

export async function generateStaticParams() {
  const games = await getCompatibilityGames();
  return games.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getCompatibilityGameBySlug(slug);
  if (!game) return { title: "Game Not Found" };

  const detail = await getGameDetailViewModel(game);
  const primaryCard = selectPrimaryReleaseCard(detail.releaseCards);
  const releaseStatus = primaryCard?.verified
    ? getStatusLabel(primaryCard.status)
    : "Unverified";

  return withCanonical(
    {
      title: `${game.title} — Compatibility`,
      description: `XeniOS compatibility report for ${game.title} (${game.titleId}). Current public release status: ${releaseStatus}.`,
    },
    `/compatibility/${game.slug}`
  );
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getCompatibilityGameBySlug(slug);
  if (!game) notFound();

  const detail = await getGameDetailViewModel(game);
  const primaryCard = selectPrimaryReleaseCard(detail.releaseCards);

  const videoGameLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    identifier: game.titleId,
    url: `${SITE_URL}/compatibility/${game.slug}`,
    gamePlatform: ["Xbox 360", "iOS", "iPadOS", "macOS"],
    applicationCategory: "Game",
    operatingSystem: "iOS, iPadOS, macOS",
    ...(primaryCard?.verified
      ? {
          additionalProperty: {
            "@type": "PropertyValue",
            name: "XeniOS compatibility",
            value: getStatusLabel(primaryCard.status),
          },
        }
      : {}),
  };

  return (
    <>
      <Script
        id={`ld-game-${game.slug}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoGameLd) }}
      />
      <GameDetailClient game={game} detail={detail} />
    </>
  );
}
