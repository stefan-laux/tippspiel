import { isAuthorized } from "@/lib/cron-auth";
import { scrapeAndCompute } from "@/lib/sync/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// Dry-run: scrape SRF + compute everything and return a summary WITHOUT touching Firestore.
// Only available in development, or with the cron secret in production.
async function handle(req: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production" && !isAuthorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const r = await scrapeAndCompute();
    const finishedBoards = r.compute.matchBoards.length;
    const sampleFinished = r.fixtures.find((f) => f.status === "FINISHED");
    const sampleBoard = sampleFinished
      ? r.compute.matchBoards.find((b) => b.fixtureId === sampleFinished.id)
      : undefined;
    return Response.json({
      ok: true,
      counts: {
        members: r.members.length,
        fixtures: r.fixtures.length,
        tips: r.tips.length,
        bonusQuestions: r.bonusQuestions.length,
        bonusAnswers: r.bonusAnswers.length,
        finishedBoards,
        liveScores: r.liveScores.size,
      },
      startedRounds: r.startedRounds,
      members: r.members,
      unresolvedTeams: [
        ...new Set(
          r.fixtures.flatMap((f) =>
            [f.home, f.away].filter((t) => !t.fifaCode).map((t) => t.name),
          ),
        ),
      ],
      bonusQuestions: r.bonusQuestions.map((q) => ({
        order: q.order,
        question: q.question,
        type: q.type,
        points: q.points,
        resolved: q.resolved,
        correct: q.correctAnswerName,
        options: q.options.length,
      })),
      overall: r.compute.overall.entries,
      sampleFinishedFixture: sampleFinished
        ? {
            id: sampleFinished.id,
            stage: sampleFinished.stage,
            isKnockout: sampleFinished.isKnockout,
            home: sampleFinished.home.name,
            away: sampleFinished.away.name,
            result: `${sampleFinished.finalHome}:${sampleFinished.finalAway}`,
            board: sampleBoard?.entries,
          }
        : null,
    });
  } catch (err) {
    return Response.json({ ok: false, error: String(err), stack: (err as Error)?.stack }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
