import "server-only";
import { adminDb, hasAdminCredentials } from "@/lib/firebase/admin";
import { COL, DOC } from "@/lib/firebase/collections";
import { getCommunityConfig } from "@/lib/config";
import type {
  Fixture,
  Tip,
  User,
  Leaderboard,
  MatchLeaderboard,
  LiveState,
  BonusQuestion,
  BonusAnswer,
  CommunityMeta,
  ScheduleSummary,
} from "@/lib/types";

// Server-side reads. In production these read Firestore via the Admin SDK. When no admin
// credentials are configured (dev/preview) they fall back to a cached live scrape so the
// UI is fully usable before Firestore is wired up.

function useDevFallback(): boolean {
  return !hasAdminCredentials() && process.env.NODE_ENV !== "production";
}

function snap() {
  return import("@/lib/dev-snapshot").then((m) => m.getDevSnapshot());
}

async function read<T>(adminFn: () => Promise<T>, devFn: (s: Awaited<ReturnType<typeof snap>>) => T, empty: T): Promise<T> {
  if (hasAdminCredentials()) {
    try {
      return await adminFn();
    } catch (err) {
      console.error("[data] Firestore read failed:", err);
      return empty;
    }
  }
  if (useDevFallback()) {
    try {
      return devFn(await snap());
    } catch {
      return empty;
    }
  }
  return empty;
}

export function getFixtures(): Promise<Fixture[]> {
  return read(
    async () => (await adminDb().collection(COL.fixtures).get()).docs.map((d) => d.data() as Fixture),
    (s) => s.fixtures,
    [],
  ).then((fx) => [...fx].sort((a, b) => a.kickoffMs - b.kickoffMs));
}

export function getFixture(id: string): Promise<Fixture | null> {
  return read(
    async () => {
      const d = await adminDb().collection(COL.fixtures).doc(id).get();
      return d.exists ? (d.data() as Fixture) : null;
    },
    (s) => s.fixtures.find((f) => f.id === id) ?? null,
    null,
  );
}

/** Batched read of just the given fixtures (1 round-trip, N doc reads) — used by the live tick. */
export function getFixturesByIds(ids: string[]): Promise<Fixture[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return read(
    async () => {
      const db = adminDb();
      const snaps = await db.getAll(...ids.map((id) => db.collection(COL.fixtures).doc(id)));
      return snaps.filter((s) => s.exists).map((s) => s.data() as Fixture);
    },
    (s) => {
      const set = new Set(ids);
      return s.fixtures.filter((f) => set.has(f.id));
    },
    [],
  );
}

/** Batched read of live-state docs (used by the live tick to detect score changes). */
export function getLiveStatesByIds(ids: string[]): Promise<LiveState[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return read(
    async () => {
      const db = adminDb();
      const snaps = await db.getAll(...ids.map((id) => db.collection(COL.liveState).doc(id)));
      return snaps.filter((s) => s.exists).map((s) => s.data() as LiveState);
    },
    (s) => {
      const set = new Set(ids);
      return s.compute.liveStates.filter((l) => set.has(l.fixtureId));
    },
    [],
  );
}

export function getAllTips(): Promise<Tip[]> {
  return read(
    async () => (await adminDb().collection(COL.tips).get()).docs.map((d) => d.data() as Tip),
    (s) => s.tips,
    [],
  );
}

export function getTipsForFixture(fixtureId: string): Promise<Tip[]> {
  return read(
    async () =>
      (await adminDb().collection(COL.tips).where("fixtureId", "==", fixtureId).get()).docs.map(
        (d) => d.data() as Tip,
      ),
    (s) => s.tips.filter((t) => t.fixtureId === fixtureId),
    [],
  );
}

export function getUsers(): Promise<User[]> {
  return read(
    async () => (await adminDb().collection(COL.users).get()).docs.map((d) => d.data() as User),
    (s) => s.compute.users,
    [],
  );
}

export function getOverallLeaderboard(): Promise<Leaderboard | null> {
  return read(
    async () => {
      const d = await adminDb().collection(COL.leaderboards).doc(DOC.overall).get();
      return d.exists ? (d.data() as Leaderboard) : null;
    },
    (s) => s.compute.overall,
    null,
  );
}

export function getLiveLeaderboard(): Promise<Leaderboard | null> {
  return read(
    async () => {
      const d = await adminDb().collection(COL.leaderboards).doc(DOC.live).get();
      return d.exists ? (d.data() as Leaderboard) : null;
    },
    (s) => s.compute.live,
    null,
  );
}

export function getMatchLeaderboard(fixtureId: string): Promise<MatchLeaderboard | null> {
  return read(
    async () => {
      const d = await adminDb().collection(COL.matchLeaderboards).doc(fixtureId).get();
      return d.exists ? (d.data() as MatchLeaderboard) : null;
    },
    (s) => s.compute.matchBoards.find((b) => b.fixtureId === fixtureId) ?? null,
    null,
  );
}

export function getLiveMatchLeaderboard(fixtureId: string): Promise<MatchLeaderboard | null> {
  return read(
    async () => {
      const d = await adminDb().collection(COL.liveMatchLeaderboards).doc(fixtureId).get();
      return d.exists ? (d.data() as MatchLeaderboard) : null;
    },
    (s) => s.compute.liveMatchBoards.find((b) => b.fixtureId === fixtureId) ?? null,
    null,
  );
}

export function getLiveState(fixtureId: string): Promise<LiveState | null> {
  return read(
    async () => {
      const d = await adminDb().collection(COL.liveState).doc(fixtureId).get();
      return d.exists ? (d.data() as LiveState) : null;
    },
    (s) => s.compute.liveStates.find((l) => l.fixtureId === fixtureId) ?? null,
    null,
  );
}

export function getBonusQuestions(): Promise<BonusQuestion[]> {
  return read(
    async () =>
      (await adminDb().collection(COL.bonusQuestions).get()).docs.map((d) => d.data() as BonusQuestion),
    (s) => s.bonusQuestions,
    [],
  ).then((qs) => [...qs].sort((a, b) => a.order - b.order));
}

export function getBonusAnswers(): Promise<BonusAnswer[]> {
  return read(
    async () =>
      (await adminDb().collection(COL.bonusAnswers).get()).docs.map((d) => d.data() as BonusAnswer),
    (s) => s.bonusAnswers,
    [],
  );
}

/** Single-doc fixture summary — the cheap read the live tick uses to decide relevance. */
export function getScheduleSummary(): Promise<ScheduleSummary | null> {
  return read(
    async () => {
      const d = await adminDb().collection(COL.meta).doc(DOC.schedule).get();
      return d.exists ? (d.data() as ScheduleSummary) : null;
    },
    (s) => ({
      updatedAtMs: s.now,
      entries: s.fixtures.map((f) => ({
        id: f.id,
        round: f.round,
        kickoffMs: f.kickoffMs,
        status: f.status,
        scrapeDoneForKickoff: Boolean(f.scrapeDoneForKickoff),
      })),
    }),
    null,
  );
}

export function getCommunityMeta(): Promise<CommunityMeta | null> {
  const cfg = getCommunityConfig();
  return read(
    async () => {
      const d = await adminDb().collection(COL.meta).doc(DOC.community).get();
      return d.exists ? (d.data() as CommunityMeta) : null;
    },
    (s) => ({
      id: s.communityId,
      name: `Community ${s.communityId}`,
      url: s.url,
      memberCount: s.members.length,
      lastSyncAtMs: s.now,
      roundNames: s.roundNames,
    }),
    { id: cfg.communityId, name: `Community ${cfg.communityId}`, url: cfg.url, memberCount: 0, lastSyncAtMs: 0 },
  );
}
