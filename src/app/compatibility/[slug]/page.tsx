import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getActiveSummary, getAllGames, getGameBySlug, getStatusLabel } from "@/lib/compatibility";
import { getDiscussionByTitleId } from "@/lib/discussions";
import { GameDetailClient } from "./game-detail-client";

export function generateStaticParams() {
  return getAllGames().map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) return { title: "Game Not Found" };

  const summary = getActiveSummary(game, "release");

  return {
    title: `${game.title} — Compatibility`,
    description: `XeniOS compatibility report for ${game.title} (${game.titleId}). Release status: ${getStatusLabel(summary.status)}.`,
  };
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) notFound();

  const discussion = getDiscussionByTitleId(game.titleId);
  return (
    <Suspense>
      <GameDetailClient game={game} discussion={discussion} />
    </Suspense>
  );
}
