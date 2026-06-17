import { MatchListItem } from "@/components/MatchListItem";
import { getFixtures, getLiveState } from "@/lib/data";
import { groupBy } from "@/lib/util";
import type { LiveState } from "@/lib/types";

// Cache the page; refresh at most once a minute to keep Firestore reads low.
export const revalidate = 60;

export default async function MatchesPage() {
  const fixtures = await getFixtures();
  const live = fixtures.filter((f) => f.status === "LIVE");
  const liveStates = new Map<string, LiveState | null>(
    await Promise.all(live.map(async (f) => [f.id, await getLiveState(f.id)] as const)),
  );

  // Group by round; rounds appear in chronological order.
  const byRound = [...groupBy(fixtures, (f) => f.round).entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Spiele</h1>
      <p className="mb-5 text-sm text-muted">Alle Partien des Turniers mit Resultaten und Tipps.</p>

      {fixtures.length === 0 && <p className="py-10 text-center text-sm text-muted">Noch keine Spiele geladen.</p>}

      <div className="space-y-7">
        {byRound.map(([round, list]) => {
          const sorted = [...list].sort((a, b) => a.kickoffMs - b.kickoffMs);
          const stage = sorted[0]?.stage ?? `Runde ${round}`;
          return (
            <section key={round}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{stage}</h2>
              <div className="space-y-2">
                {sorted.map((f) => {
                  const ls = f.status === "LIVE" ? liveStates.get(f.id) : null;
                  return (
                    <div key={f.id}>
                      <MatchListItem
                        fixture={f}
                        liveScore={ls ? { home: ls.homeGoals, away: ls.awayGoals } : null}
                        liveDetail={ls?.elapsed != null ? `${ls.elapsed}'` : ls?.period}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
