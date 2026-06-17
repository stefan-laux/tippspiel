import "server-only";
import {
  initializeApp,
  getApps,
  getApp,
  cert,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-side Firebase Admin SDK. This is the ONLY thing that writes to Firestore
// (the scraper / cron jobs). The Admin SDK bypasses security rules, so the rules can
// lock all client writes to `false` while the server still writes freely.
//
// Credentials come from a service-account key, supplied either as:
//   FIREBASE_SERVICE_ACCOUNT  = the full service-account JSON (single-line / escaped), or
//   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (private key may use \n).

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const json = JSON.parse(raw);
    return {
      projectId: json.project_id,
      clientEmail: json.client_email,
      privateKey: (json.private_key as string)?.replace(/\\n/g, "\n"),
    };
  }
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT (JSON) or " +
        "FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.",
    );
  }
  return { projectId, clientEmail, privateKey };
}

let cachedApp: App | undefined;

function adminApp(): App {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length ? getApp() : initializeApp({ credential: cert(loadServiceAccount()) });
  return cachedApp;
}

let cachedDb: Firestore | undefined;

export function adminDb(): Firestore {
  if (!cachedDb) {
    cachedDb = getFirestore(adminApp());
    // Optional fields (e.g. a knockout placeholder team's fifaCode/flag) are `undefined`;
    // skip them rather than erroring. settings() can only run once per instance — under
    // dev HMR the instance may already be configured, so ignore a repeat call.
    try {
      cachedDb.settings({ ignoreUndefinedProperties: true });
    } catch {
      /* already initialized (HMR) */
    }
  }
  return cachedDb;
}

/** True when admin credentials are configured (used to give friendly errors in routes). */
export function hasAdminCredentials(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT ||
      (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
  );
}
