import { isAuthorized } from "@/lib/cron-auth";
import { hasAdminCredentials } from "@/lib/firebase/admin";
import { fullSync } from "@/lib/sync/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Full scrape + recompute. Run periodically (~10-15 min), on deploy/startup, and it is
// also triggered automatically by the live tick at each kickoff / final whistle.
async function handle(req: Request): Promise<Response> {
  if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!hasAdminCredentials()) {
    return Response.json({ ok: false, error: "Missing Firebase Admin credentials" }, { status: 500 });
  }
  try {
    const result = await fullSync();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
