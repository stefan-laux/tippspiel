import { revalidatePath } from "next/cache";

// On-demand cache invalidation. Pages are cached for a day (revalidate=86400) and only
// regenerated (re-reading Firestore) when one of these is called after real data changes.

export function revalidateAll(): void {
  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  revalidatePath("/bonus");
  revalidatePath("/match/[id]", "page");
}

/** Pages affected by a kickoff (tips visible) or full-time (results + leaderboard). */
export function revalidateLivePages(): void {
  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  revalidatePath("/match/[id]", "page");
}
