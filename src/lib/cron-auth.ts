import { timingSafeEqual } from "node:crypto";
import { getCronSecret } from "@/lib/config";

// Cron routes are public URLs, so they require a shared secret. Vercel Cron sends it as
// `Authorization: Bearer <CRON_SECRET>` (preferred — headers don't land in access logs);
// external schedulers (cron-job.org) can use that header or a `?secret=` query param.
// If no secret is configured we only allow non-prod, so a missing secret fails safe.

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function isAuthorized(req: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return process.env.NODE_ENV !== "production";

  const auth = req.headers.get("authorization");
  if (auth && safeEqual(auth, `Bearer ${secret}`)) return true;

  try {
    const q = new URL(req.url).searchParams.get("secret");
    if (q && safeEqual(q, secret)) return true;
  } catch {
    /* ignore malformed URL */
  }
  return false;
}
