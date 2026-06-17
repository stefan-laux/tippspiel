"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { COL } from "@/lib/firebase/collections";
import { Flag } from "@/components/Flag";
import { StatusBadge, LiveDot, Pill } from "@/components/badges";
import { Countdown } from "@/components/Countdown";
import { formatTime, relativeDay, score } from "@/lib/format";
import type { Fixture, LiveState } from "@/lib/types";

/** Featured match card. The live score + minute update in real time via onSnapshot. */
export function MatchHero({ fixture, live }: { fixture: Fixture; live?: LiveState | null }) {
  const f = fixture;
  const [liveState, setLiveState] = useState<LiveState | null>(live ?? null);

  const isLive = f.status === "LIVE" || (liveState?.isLive ?? false);

  useEffect(() => {
    if (f.status !== "LIVE") return;
    let unsub = () => {};
    try {
      unsub = onSnapshot(
        doc(clientDb(), COL.liveState, f.id),
        (snap) => snap.exists() && setLiveState(snap.data() as LiveState),
        () => {},
      );
    } catch {
      /* keep initial */
    }
    return () => unsub();
  }, [f.id, f.status]);

  const homeGoals = liveState?.homeGoals ?? f.finalHome;
  const awayGoals = liveState?.awayGoals ?? f.finalAway;
  const showScore = isLive || f.status === "FINISHED";
  const minute = liveState?.elapsed != null ? `${liveState.elapsed}'` : liveState?.period || "LIVE";

  return (
    <Link
      href={`/match/${f.id}`}
      className="block overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-surface-2 to-surface p-5 transition-colors hover:border-accent/40 sm:p-7"
    >
      <div className="mb-4 flex items-center justify-between">
        <Pill tone={isLive ? "live" : "accent"}>{f.stage}</Pill>
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-live">
            <LiveDot /> {minute}
          </span>
        ) : (
          <span className="text-xs font-semibold text-muted">
            {relativeDay(f.kickoffMs)} · {formatTime(f.kickoffMs)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Flag team={f.home} size="xl" />
          <span className="text-sm font-bold sm:text-base">{f.home.name}</span>
        </div>
        <div className="flex flex-col items-center">
          {showScore ? (
            <span className="text-4xl font-black tabular-nums sm:text-5xl">{score(homeGoals, awayGoals)}</span>
          ) : (
            <span className="text-2xl font-black text-muted sm:text-3xl">vs</span>
          )}
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <Flag team={f.away} size="xl" />
          <span className="text-sm font-bold sm:text-base">{f.away.name}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        {f.status === "SCHEDULED" ? (
          <>
            <Countdown targetMs={f.kickoffMs} />
            <span className="hidden text-right text-xs text-muted sm:block">
              Tipps & Statistiken
              <br />
              sichtbar ab Anpfiff
            </span>
          </>
        ) : (
          <>
            <StatusBadge status={f.status} detail={isLive ? minute : undefined} />
            <span className="text-sm font-semibold text-accent">Zum Spiel →</span>
          </>
        )}
      </div>
    </Link>
  );
}
