import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { COL, DOC } from "@/lib/firebase/collections";
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

// Admin-side Firestore writes. Everything here runs server-only (cron/scrape routes).
// Docs are upserted by deterministic id so re-runs are idempotent. Plain epoch-ms
// numbers are used for times (range-queryable, trivially serializable to the client).

const FIRESTORE_BATCH_LIMIT = 450; // < 500 hard cap, leaves headroom

type DocOp = { path: [string, string]; data: Record<string, unknown> };

async function commitUpserts(ops: DocOp[]): Promise<void> {
  const db = adminDb();
  for (let i = 0; i < ops.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + FIRESTORE_BATCH_LIMIT)) {
      batch.set(db.collection(op.path[0]).doc(op.path[1]), op.data, { merge: true });
    }
    await batch.commit();
  }
}

export async function writeCommunityMeta(meta: CommunityMeta): Promise<void> {
  await adminDb().collection(COL.meta).doc(DOC.community).set(meta, { merge: true });
}

export async function writeSchedule(summary: ScheduleSummary): Promise<void> {
  await adminDb().collection(COL.meta).doc(DOC.schedule).set(summary, { merge: false });
}

export async function writeFixtures(fixtures: Fixture[]): Promise<void> {
  await commitUpserts(
    fixtures.map((f) => ({ path: [COL.fixtures, f.id], data: f as unknown as Record<string, unknown> })),
  );
}

export async function writeTips(tips: Tip[]): Promise<void> {
  await commitUpserts(
    tips.map((t) => ({ path: [COL.tips, t.id], data: t as unknown as Record<string, unknown> })),
  );
}

export async function writeUsers(users: User[]): Promise<void> {
  await commitUpserts(
    users.map((u) => ({ path: [COL.users, u.id], data: u as unknown as Record<string, unknown> })),
  );
}

export async function writeBonusQuestions(questions: BonusQuestion[]): Promise<void> {
  await commitUpserts(
    questions.map((q) => ({
      path: [COL.bonusQuestions, q.id],
      data: q as unknown as Record<string, unknown>,
    })),
  );
}

export async function writeBonusAnswers(answers: BonusAnswer[]): Promise<void> {
  await commitUpserts(
    answers.map((a) => ({
      path: [COL.bonusAnswers, a.id],
      data: a as unknown as Record<string, unknown>,
    })),
  );
}

export async function writeMatchLeaderboards(boards: MatchLeaderboard[]): Promise<void> {
  await commitUpserts(
    boards.map((b) => ({
      path: [COL.matchLeaderboards, b.fixtureId],
      data: b as unknown as Record<string, unknown>,
    })),
  );
}

export async function writeLiveMatchLeaderboards(boards: MatchLeaderboard[]): Promise<void> {
  await commitUpserts(
    boards.map((b) => ({
      path: [COL.liveMatchLeaderboards, b.fixtureId],
      data: b as unknown as Record<string, unknown>,
    })),
  );
}

export async function writeLiveStates(states: LiveState[]): Promise<void> {
  await commitUpserts(
    states.map((s) => ({
      path: [COL.liveState, s.fixtureId],
      data: s as unknown as Record<string, unknown>,
    })),
  );
}

export async function writeLeaderboard(lb: Leaderboard): Promise<void> {
  await adminDb().collection(COL.leaderboards).doc(lb.id).set(lb, { merge: false });
}

export async function writeHealth(data: Record<string, unknown>): Promise<void> {
  await adminDb().collection(COL.meta).doc(DOC.health).set(data, { merge: true });
}

export async function deleteDocs(collection: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = adminDb();
  for (let i = 0; i < ids.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = db.batch();
    for (const id of ids.slice(i, i + FIRESTORE_BATCH_LIMIT)) {
      batch.delete(db.collection(collection).doc(id));
    }
    await batch.commit();
  }
}
