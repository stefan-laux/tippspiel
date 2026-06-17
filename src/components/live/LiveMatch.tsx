"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { COL, DOC } from "@/lib/firebase/collections";
import { Flag } from "@/components/Flag";
import { LiveDot } from "@/components/badges";
import { TipsBoard } from "@/components/TipsBoard";
import { Leaderboard } from "@/components/Leaderboard";
import { score } from "@/lib/format";
import type { Fixture, LiveState, MatchLeaderboard, Leaderboard as LeaderboardT } from "@/lib/types";

// Realtime live match view. First paints with server-provided initial data, then
// subscribes to Firestore so the minute, score, tips and leaderboards update live.
export function LiveMatch({
  fixture,
  initialLive,
  initialBoard,
  initialOverallLive,
}: {
  fixture: Fixture;
  initialLive: LiveState | null;
  initialBoard: MatchLeaderboard | null;
  initialOverallLive: LeaderboardT | null;
}) {
  const [live, setLive] = useState<LiveState | null>(initialLive);
  const [board, setBoard] = useState<MatchLeaderboard | null>(initialBoard);
  const [overall, setOverall] = useState<LeaderboardT | null>(initialOverallLive);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let unsubs: Array<() => void> = [];
    const onErr = (e: unknown) => {
      console.error("live snapshot failed", e);
      setStale(true);
    };
    try {
      const db = clientDb();
      unsubs = [
        onSnapshot(doc(db, COL.liveState, fixture.id), (s) => s.exists() && setLive(s.data() as LiveState), onErr),
        onSnapshot(doc(db, COL.liveMatchLeaderboards, fixture.id), (s) => s.exists() && setBoard(s.data() as MatchLeaderboard), onErr),
        onSnapshot(doc(db, COL.leaderboards, DOC.live), (s) => s.exists() && setOverall(s.data() as LeaderboardT), onErr),
      ];
    } catch (e) {
      onErr(e); // client SDK unavailable -> keep initial server data
    }
    return () => unsubs.forEach((u) => u());
  }, [fixture.id]);

  const homeGoals = live?.homeGoals ?? fixture.finalHome;
  const awayGoals = live?.awayGoals ?? fixture.finalAway;
  const minute = live?.elapsed != null ? `${live.elapsed}'` : live?.period || "LIVE";

  return (
    <div>
      {stale && (
        <p className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-center text-xs text-muted">
          Live-Aktualisierung pausiert – die angezeigten Werte könnten veraltet sein.
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-live/40 bg-gradient-to-b from-surface-2 to-surface p-5 sm:p-7">
        <div className="mb-4 flex items-center justify-center gap-2 text-sm font-bold text-live">
          <LiveDot /> {minute}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <Flag team={fixture.home} size="xl" />
            <span className="text-sm font-bold sm:text-base">{fixture.home.name}</span>
          </div>
          <span className="text-4xl font-black tabular-nums sm:text-5xl">{score(homeGoals, awayGoals)}</span>
          <div className="flex flex-col items-center gap-2 text-center">
            <Flag team={fixture.away} size="xl" />
            <span className="text-sm font-bold sm:text-base">{fixture.away.name}</span>
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-8 inline-flex items-center gap-2 text-lg font-bold">
        <LiveDot /> Tipps & Live-Punkte
      </h2>
      <TipsBoard entries={board?.entries ?? []} live />

      <h2 className="mb-3 mt-8 inline-flex items-center gap-2 text-lg font-bold">
        <LiveDot /> Live-Gesamtrangliste
      </h2>
      <p className="mb-3 text-xs text-muted">Provisorische Wertung inklusive laufender Spiele.</p>
      <Leaderboard entries={overall?.entries ?? []} live />
    </div>
  );
}
