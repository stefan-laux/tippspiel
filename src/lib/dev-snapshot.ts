import "server-only";
import { scrapeAndCompute, type ScrapeComputeResult } from "@/lib/sync/orchestrator";

// DEV-ONLY fallback: when no Firebase Admin credentials are configured, serve the UI
// from a live SRF scrape cached in memory, so the app is fully previewable before
// Firestore is wired up. In production this path is disabled (reads return empty until
// the first sync writes to Firestore).

let cache: { at: number; data: ScrapeComputeResult } | null = null;
let inflight: Promise<ScrapeComputeResult> | null = null;
const TTL_MS = 5 * 60_000;

export async function getDevSnapshot(): Promise<ScrapeComputeResult> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  if (inflight) return inflight;
  inflight = scrapeAndCompute()
    .then((data) => {
      cache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
