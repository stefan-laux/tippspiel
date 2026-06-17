import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag } from "@/components/Flag";
import { StatusBadge, Pill } from "@/components/badges";
import { Countdown } from "@/components/Countdown";
import { TipsBoard } from "@/components/TipsBoard";
import { LiveMatch } from "@/components/live/LiveMatch";
import { score, relativeDay, formatTime } from "@/lib/format";
import {
  getFixture,
  getMatchLeaderboard,
  getLiveMatchLeaderboard,
  getLiveState,
  getLiveLeaderboard,
} from "@/lib/data";
import type { Fixture } from "@/lib/types";

// Cache for a day; the cron invalidates these on-demand when data actually changes
// (kickoff, full-time, daily sync). Live scores stay realtime via the match page.
export const revalidate = 86400;

function BackLink() {
  return (
    <Link href="/matches" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
      ← Spiele
    </Link>
  );
}

function StaticHeader({ fixture }: { fixture: Fixture }) {
  const f = fixture;
  const showScore = f.status === "FINISHED";
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-surface-2 to-surface p-5 sm:p-7">
      <div className="mb-4 flex items-center justify-between">
        <Pill>{f.stage}</Pill>
        <StatusBadge status={f.status} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Flag team={f.home} size="xl" />
          <span className="text-sm font-bold sm:text-base">{f.home.name}</span>
        </div>
        <span className="text-4xl font-black tabular-nums sm:text-5xl">
          {showScore ? score(f.finalHome, f.finalAway) : "vs"}
        </span>
        <div className="flex flex-col items-center gap-2 text-center">
          <Flag team={f.away} size="xl" />
          <span className="text-sm font-bold sm:text-base">{f.away.name}</span>
        </div>
      </div>
      {f.location && <p className="mt-4 text-center text-xs text-muted">{f.location}</p>}
    </div>
  );
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fixture = await getFixture(id);
  if (!fixture) notFound();

  if (fixture.status === "LIVE") {
    const [live, board, overallLive] = await Promise.all([
      getLiveState(id),
      getLiveMatchLeaderboard(id),
      getLiveLeaderboard(),
    ]);
    return (
      <div>
        <BackLink />
        <LiveMatch fixture={fixture} initialLive={live} initialBoard={board} initialOverallLive={overallLive} />
      </div>
    );
  }

  if (fixture.status === "SCHEDULED") {
    return (
      <div>
        <BackLink />
        <StaticHeader fixture={fixture} />
        <div className="card mt-6 flex flex-col items-center gap-4 p-6 text-center">
          <p className="text-sm text-muted">
            Anpfiff {relativeDay(fixture.kickoffMs)} um {formatTime(fixture.kickoffMs)}
          </p>
          <Countdown targetMs={fixture.kickoffMs} />
          <p className="max-w-sm text-sm text-muted">
            Die Tipps und Statistiken werden sichtbar, sobald das Spiel beginnt.
          </p>
        </div>
      </div>
    );
  }

  // FINISHED
  const board = await getMatchLeaderboard(id);
  return (
    <div>
      <BackLink />
      <StaticHeader fixture={fixture} />
      <h2 className="mb-3 mt-8 text-lg font-bold">Tipps & Punkte</h2>
      <TipsBoard entries={board?.entries ?? []} />
    </div>
  );
}
