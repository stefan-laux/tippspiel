import { Leaderboard } from "@/components/Leaderboard";
import { LiveDot } from "@/components/badges";
import { getOverallLeaderboard, getLiveLeaderboard, getFixtures } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [overall, liveLb, fixtures] = await Promise.all([
    getOverallLeaderboard(),
    getLiveLeaderboard(),
    getFixtures(),
  ]);
  const hasLive = fixtures.some((f) => f.status === "LIVE");

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Rangliste</h1>
      <p className="mb-5 text-sm text-muted">Gesamtwertung aus beendeten Spielen und Zusatzfragen.</p>

      {hasLive && liveLb && liveLb.entries.length > 0 && (
        <section className="mb-7">
          <h2 className="mb-3 inline-flex items-center gap-2 text-lg font-bold">
            <LiveDot /> Live-Rangliste
          </h2>
          <p className="mb-3 text-xs text-muted">
            Inklusive provisorischer Punkte aus laufenden Spielen.
          </p>
          <Leaderboard entries={liveLb.entries} live />
        </section>
      )}

      <Leaderboard entries={overall?.entries ?? []} />
    </div>
  );
}
