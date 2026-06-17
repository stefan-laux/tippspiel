import clsx from "clsx";
import { RankBadge } from "@/components/badges";
import type { MatchLeaderboardEntry, PointsBreakdown } from "@/lib/types";

// Which scoring categories a tip earned points in (in display order). Mirrors how SRF
// shows "wofür es Punkte gab": Tendenz (Sieger/Unentschieden), Tordifferenz, Heim-, Gasttore.
function earnedParts(b: PointsBreakdown): { label: string; pts: number }[] {
  return [
    { label: "Tendenz", pts: b.outcome },
    { label: "Tordifferenz", pts: b.diff },
    { label: "Heimtore", pts: b.home },
    { label: "Gasttore", pts: b.away },
  ].filter((p) => p.pts > 0);
}

function Breakdown({ breakdown, live }: { breakdown: PointsBreakdown; live?: boolean }) {
  const parts = earnedParts(breakdown);
  if (parts.length === 0) {
    return <span className="text-xs text-faint">keine Punkte</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {parts.map((p) => (
        <span
          key={p.label}
          className={clsx(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
            live ? "bg-live/15 text-live" : "bg-accent/15 text-accent",
          )}
        >
          {p.label}
          <span className="tabular-nums opacity-80">+{p.pts}</span>
        </span>
      ))}
    </div>
  );
}

/** Per-match leaderboard: each player's tip, the points it scored, and the breakdown. */
export function TipsBoard({ entries, live = false }: { entries: MatchLeaderboardEntry[]; live?: boolean }) {
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">Noch keine Tipps sichtbar.</p>;
  }
  return (
    <div>
      {/* Mobile cards */}
      <ul className="space-y-2 sm:hidden">
        {entries.map((e, i) => (
          <li key={e.userId} className="rounded-xl border border-border bg-surface px-3 py-2.5">
            <div className="flex items-center gap-3">
              <RankBadge rank={i + 1} />
              <span className="min-w-0 flex-1 truncate font-semibold">{e.displayName}</span>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-sm font-bold tabular-nums">
                {e.predHome}:{e.predAway}
              </span>
              <span className={clsx("w-10 text-right text-lg font-extrabold tabular-nums", live ? "text-live" : "text-accent")}>
                {e.points}
              </span>
            </div>
            <div className="mt-2 pl-10">
              <Breakdown breakdown={e.breakdown} live={live} />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="w-14 px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">Spieler</th>
              <th className="px-3 py-2.5 text-center">Tipp</th>
              <th className="px-3 py-2.5">Punkte-Verteilung</th>
              <th className="px-3 py-2.5 text-right">{live ? "Live" : "Punkte"}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.userId} className="border-t border-border bg-surface">
                <td className="px-3 py-2.5">
                  <RankBadge rank={i + 1} />
                </td>
                <td className="px-3 py-2.5 font-semibold">{e.displayName}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className="rounded-md bg-surface-2 px-2 py-0.5 font-bold tabular-nums">
                    {e.predHome}:{e.predAway}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Breakdown breakdown={e.breakdown} live={live} />
                </td>
                <td className={clsx("px-3 py-2.5 text-right text-lg font-extrabold tabular-nums", live ? "text-live" : "text-accent")}>
                  {e.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
