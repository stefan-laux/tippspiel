import { isAuthorized } from "@/lib/cron-auth";
import { hasAdminCredentials } from "@/lib/firebase/admin";
import { liveTick } from "@/lib/sync/orchestrator";
import { revalidateLivePages } from "@/lib/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Frequent live update (~1 min). Polls ESPN, refreshes live state/boards/leaderboard,
// and triggers a full sync at kickoff (to reveal tips) and at the final whistle.
async function handle(req: Request): Promise<Response> {
  if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!hasAdminCredentials()) {
    return Response.json({ ok: false, error: "Missing Firebase Admin credentials" }, { status: 500 });
  }
  try {
    const result = await liveTick();
    // Refresh the cached pages only on real transitions (kickoff/tips, full-time).
    if (result.finalized > 0 || result.ranTipScrape) revalidateLivePages();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
