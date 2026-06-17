import clsx from "clsx";
import { RankBadge, Pill } from "@/components/badges";
import type { LeaderboardEntry } from "@/lib/types";

function deltaLabel(delta?: number) {
  if (!delta) return null;
  const up = delta > 0;
  return (
    <Pill tone={up ? "accent" : "muted"} className="tabular-nums">
      {up ? "+" : ""}
      {delta} live
    </Pill>
  );
}

export function Leaderboard({
  entries,
  live = false,
}: {
  entries: LeaderboardEntry[];
  live?: boolean;
}) {
  if (entries.length === 0) {
    return <p className="px-1 py-8 text-center text-sm text-muted">Noch keine Rangliste verfügbar.</p>;
  }

  return (
    <div>
      {/* Mobile: cards */}
      <ul className="space-y-2 sm:hidden">
        {entries.map((e) => (
          <li
            key={e.userId}
            className={clsx(
              "flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5",
              e.rank <= 3 && "ring-1 ring-border",
            )}
          >
            <RankBadge rank={e.rank} />
            <span className="min-w-0 flex-1 truncate font-semibold">{e.displayName}</span>
            {live && deltaLabel(e.delta)}
            <span className="tabular-nums text-lg font-extrabold text-accent">{e.points}</span>
          </li>
        ))}
      </ul>

      {/* Desktop: dense table */}
      <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="w-16 px-4 py-2.5 font-semibold">#</th>
              <th className="px-4 py-2.5 font-semibold">Spieler</th>
              {!live && <th className="px-4 py-2.5 text-right font-semibold">Spiele</th>}
              {!live && <th className="px-4 py-2.5 text-right font-semibold">Bonus</th>}
              {live && <th className="px-4 py-2.5 text-right font-semibold">Live</th>}
              <th className="px-4 py-2.5 text-right font-semibold">Punkte</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.userId} className="border-t border-border bg-surface hover:bg-surface-2/60">
                <td className="px-4 py-2.5">
                  <RankBadge rank={e.rank} />
                </td>
                <td className="px-4 py-2.5 font-semibold">{e.displayName}</td>
                {!live && <td className="px-4 py-2.5 text-right tabular-nums text-muted">{e.matchPoints ?? "–"}</td>}
                {!live && <td className="px-4 py-2.5 text-right tabular-nums text-muted">{e.bonusPoints ?? 0}</td>}
                {live && (
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {e.delta ? (
                      <span className={e.delta > 0 ? "text-accent" : "text-muted"}>
                        {e.delta > 0 ? "+" : ""}
                        {e.delta}
                      </span>
                    ) : (
                      "–"
                    )}
                  </td>
                )}
                <td className="px-4 py-2.5 text-right tabular-nums text-lg font-extrabold text-accent">{e.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
