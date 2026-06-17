import Link from "next/link";
import clsx from "clsx";
import { Flag } from "@/components/Flag";
import { StatusBadge } from "@/components/badges";
import { formatTime, score } from "@/lib/format";
import type { Fixture } from "@/lib/types";

/** A compact, tappable match row used in lists. */
export function MatchListItem({
  fixture,
  liveScore,
  liveDetail,
}: {
  fixture: Fixture;
  liveScore?: { home: number | null; away: number | null } | null;
  liveDetail?: string | null;
}) {
  const f = fixture;
  const isLive = f.status === "LIVE";
  const isDone = f.status === "FINISHED";
  const homeGoals = liveScore?.home ?? f.finalHome;
  const awayGoals = liveScore?.away ?? f.finalAway;

  return (
    <Link
      href={`/match/${f.id}`}
      className={clsx(
        "group flex items-center gap-2 rounded-xl border bg-surface px-3 py-3 transition-colors hover:bg-surface-2/70",
        isLive ? "border-live/40" : "border-border",
      )}
    >
      <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center justify-end gap-2 text-right">
          <span className="truncate text-sm font-semibold">{f.home.name}</span>
          <Flag team={f.home} size="sm" />
        </div>

        <div className="flex min-w-[3.5rem] flex-col items-center">
          {isDone || isLive ? (
            <span className={clsx("rounded-md px-2 py-0.5 text-base font-extrabold tabular-nums", isLive ? "bg-live/15 text-live" : "bg-surface-2")}>
              {score(homeGoals, awayGoals)}
            </span>
          ) : (
            <span className="text-sm font-bold tabular-nums text-muted">{formatTime(f.kickoffMs)}</span>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <Flag team={f.away} size="sm" />
          <span className="truncate text-sm font-semibold">{f.away.name}</span>
        </div>
      </div>

      <StatusBadge status={f.status} detail={isLive ? liveDetail : undefined} className="ml-1 hidden xs:inline-flex sm:inline-flex" />
    </Link>
  );
}
