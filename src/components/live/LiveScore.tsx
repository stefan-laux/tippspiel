"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import clsx from "clsx";
import { clientDb } from "@/lib/firebase/client";
import { COL } from "@/lib/firebase/collections";
import { score } from "@/lib/format";
import type { LiveState } from "@/lib/types";

type Live = { home: number | null; away: number | null; elapsed: number | null; period: string | null };

/** Realtime score badge for a live fixture (subscribes to liveState/{id}). */
export function LiveScore({
  fixtureId,
  initial,
  className,
}: {
  fixtureId: string;
  initial?: Live | null;
  className?: string;
}) {
  const [s, setS] = useState<Live | null>(initial ?? null);
  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = onSnapshot(
        doc(clientDb(), COL.liveState, fixtureId),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data() as LiveState;
            setS({ home: d.homeGoals, away: d.awayGoals, elapsed: d.elapsed, period: d.period });
          }
        },
        () => {},
      );
    } catch {
      /* keep initial */
    }
    return () => unsub();
  }, [fixtureId]);

  return (
    <span className={clsx("rounded-md bg-live/15 px-2 py-0.5 text-base font-extrabold tabular-nums text-live", className)}>
      {score(s?.home, s?.away)}
    </span>
  );
}
