import Link from "next/link";
import { MatchHero } from "@/components/MatchHero";
import { MatchListItem } from "@/components/MatchListItem";
import { Leaderboard } from "@/components/Leaderboard";
import { LiveDot } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import { getFixtures, getOverallLeaderboard, getLiveState, getCommunityMeta } from "@/lib/data";
import type { Fixture, LiveState } from "@/lib/types";

export const dynamic = "force-dynamic";

function SectionHeader({ title, href, hint }: { title: React.ReactNode; href?: string; hint?: string }) {
  return (
    <div className="mb-3 mt-8 flex items-end justify-between first:mt-0">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {href ? (
        <Link href={href} className="text-sm font-semibold text-accent hover:underline">
          {hint || "Alle"} →
        </Link>
      ) : null}
    </div>
  );
}

export default async function HomePage() {
  const [fixtures, overall, meta] = await Promise.all([
    getFixtures(),
    getOverallLeaderboard(),
    getCommunityMeta(),
  ]);
  const now = Date.now();

  const liveFixtures = fixtures.filter((f) => f.status === "LIVE");
  const liveStates = new Map<string, LiveState | null>(
    await Promise.all(liveFixtures.map(async (f) => [f.id, await getLiveState(f.id)] as const)),
  );

  const upcoming = fixtures
    .filter((f) => f.status === "SCHEDULED")
    .sort((a, b) => a.kickoffMs - b.kickoffMs);
  const nextUp: Fixture | undefined = upcoming.find((f) => f.kickoffMs >= now) ?? upcoming[0];

  const heroLive = liveFixtures[0];
  const hero = heroLive ?? nextUp;

  const recent = fixtures
    .filter((f) => f.status === "FINISHED")
    .sort((a, b) => b.kickoffMs - a.kickoffMs)
    .slice(0, 6);

  if (fixtures.length === 0 && (!overall || overall.entries.length === 0)) {
    return <SetupNotice />;
  }

  return (
    <div>
      {hero && <MatchHero fixture={hero} live={heroLive ? liveStates.get(heroLive.id) : null} />}

      {liveFixtures.length > 1 && (
        <>
          <SectionHeader title={<span className="inline-flex items-center gap-2"><LiveDot /> Live jetzt</span>} />
          <div className="space-y-2">
            {liveFixtures.slice(heroLive ? 1 : 0).map((f) => {
              const ls = liveStates.get(f.id);
              return (
                <MatchListItem
                  key={f.id}
                  fixture={f}
                  liveScore={ls ? { home: ls.homeGoals, away: ls.awayGoals } : null}
                  liveDetail={ls?.elapsed != null ? `${ls.elapsed}'` : ls?.period}
                />
              );
            })}
          </div>
        </>
      )}

      <SectionHeader title="Rangliste" href="/leaderboard" hint="Komplett" />
      <Leaderboard entries={(overall?.entries ?? []).slice(0, 5)} />

      {recent.length > 0 && (
        <>
          <SectionHeader title="Letzte Resultate" href="/matches" />
          <div className="space-y-2">
            {recent.map((f) => (
              <MatchListItem key={f.id} fixture={f} />
            ))}
          </div>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <SectionHeader title="Kommende Spiele" href="/matches" />
          <div className="space-y-2">
            {upcoming.slice(0, 5).map((f) => (
              <MatchListItem key={f.id} fixture={f} />
            ))}
          </div>
        </>
      )}

      {meta?.lastSyncAtMs ? (
        <p className="mt-10 text-center text-xs text-faint">
          Daten aus {meta.name} · zuletzt aktualisiert {formatDateTime(meta.lastSyncAtMs)}
        </p>
      ) : null}
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-6 text-center">
      <div className="mb-3 text-4xl">⚽</div>
      <h1 className="text-xl font-bold">Noch keine Daten</h1>
      <p className="mt-2 text-sm text-muted">
        Sobald die erste Synchronisierung gelaufen ist (Cron-Job <code className="text-fg">/api/cron/sync</code>),
        erscheinen hier die Rangliste, Spiele und Tipps deiner Community.
      </p>
    </div>
  );
}
