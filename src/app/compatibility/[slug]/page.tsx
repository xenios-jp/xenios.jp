import { notFound } from "next/navigation";
import { getStatusLabel } from "@/lib/compatibility";
import {
  getCompatibilityGameBySlug,
  getCompatibilityGames,
  getGameDetailViewModel,
  selectPrimaryReleaseCard,
} from "@/lib/game-detail";
import { withCanonical } from "@/lib/metadata";
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
  return <GameDetailClient game={game} detail={detail} />;
}
