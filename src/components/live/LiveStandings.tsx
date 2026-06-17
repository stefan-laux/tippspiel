"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { COL, DOC } from "@/lib/firebase/collections";
import { Leaderboard } from "@/components/Leaderboard";
import type { Leaderboard as LeaderboardT, LeaderboardEntry } from "@/lib/types";

/** Realtime live standings (subscribes to leaderboards/live). */
export function LiveStandings({ initial }: { initial: LeaderboardEntry[] }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initial);
  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = onSnapshot(
        doc(clientDb(), COL.leaderboards, DOC.live),
        (snap) => snap.exists() && setEntries((snap.data() as LeaderboardT).entries ?? []),
        () => {},
      );
    } catch {
      /* keep initial */
    }
    return () => unsub();
  }, []);
  return <Leaderboard entries={entries} live />;
}
