<div align="center">

# ⚽ WM26 Tipps

**A self-hostable, real-time tracker for the public [SRF WM-Tippspiel](https://wmtippspiel.srf.ch).**

Mirror any SRF prediction community, see a live leaderboard, per-match tips & points, and a
real-time live-match view — fast, mobile-first, and far nicer than the original UI. No login required.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149eca?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Firestore](https://img.shields.io/badge/Firestore-Firebase-ffca28?logo=firebase)
![License: MIT](https://img.shields.io/badge/License-MIT-green)

</div>

---

## ✨ Features

- 🔗 **Point it at any community** — change one env var (`SRF_COMMUNITY_URL`) and it tracks *your* group.
- 🏆 **Live leaderboard** — overall standings plus a provisional live ranking during matches.
- ⚽ **Per-match view** — everyone's tips with a clear points breakdown (Tendenz / Tordifferenz / Heim- / Gasttore), exactly like SRF.
- 🔴 **Real-time live matches** — minute, live score and live points update via Firestore in real time (no page reload).
- ⭐ **Bonus questions (Zusatzfragen)** — every member's answers and points, incl. the 50-point World Champion tip.
- 📱 **Mobile-first, clean on desktop** — a modern, dark, sporty UI.
- 🆓 **No paid APIs** — live data comes from ESPN's free, key-less scoreboard; results & tips are scraped from the public SRF pages. No login, no API keys for match data.
- 🔒 **No auth, read-only by design** — the site only reads Firestore; all writes happen server-side via the Admin SDK and are locked by security rules.

> [!NOTE]
> The scraped data (tips, results, bonus answers) is **public** on the SRF community page — there is no login and no private data involved.

---

## 🧠 How it works

```
SRF community page  ──scrape──┐
(members, tips, bonus,        │
 final results)               ▼
                         Cron routes  ──►  Firestore  ──►  Next.js pages (read-only)
ESPN scoreboard ──live──►  (scrape +                        └─ live view via onSnapshot
(score + minute)            score +
                            write)
```

- **`/api/cron/sync`** — full scrape + recompute (members, fixtures, visible tips, bonus, points, leaderboards).
- **`/api/cron/live`** — frequent live tick: polls ESPN, updates live score/minute/leaderboards, and auto-triggers a full sync at each kickoff (new tips become visible) and final whistle.

SRF hides every match's tips until kickoff, so tips naturally become visible exactly when a game starts — which is when the live tick scrapes them. Points are **computed in-app** and have been verified to match SRF's own numbers exactly.

---

## 🚀 Quick start (local)

```bash
git clone https://github.com/stefan-laux/tippspiel.git
cd tippspiel
npm install
cp .env.example .env.local   # then edit (see Configuration)
npm run dev                  # http://localhost:3000
npm test                     # scoring + team-resolution unit tests
```

> Without a Firebase Admin key, dev mode auto-serves a cached live scrape so you can preview the whole UI immediately. Add the key (below) to read/write Firestore for real.

---

## ⚙️ Configuration

All configuration is via environment variables (`.env.local` locally, project settings when deployed).

| Variable | Required | Description |
|---|---|---|
| `SRF_COMMUNITY_URL` | ✅ | The community to mirror, e.g. `https://wmtippspiel.srf.ch/communities/32216`. **Change this to track your own group.** |
| `NEXT_PUBLIC_FIREBASE_*` | ✅ | Firebase **Web** config (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId). Safe to expose; rules enforce read-only. |
| `FIREBASE_SERVICE_ACCOUNT` | ✅ (prod) | The Firebase **service-account JSON on one line** (server-only writes). Alternatively set `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`. |
| `CRON_SECRET` | ✅ (prod) | Random string protecting the cron routes. Sent by the scheduler as `Authorization: Bearer <secret>` or `?secret=`. |
| `FOOTBALL_API_KEY` | ⬜ | Optional. Not needed — live data uses ESPN's free endpoint. |
| `LIVE_FEED_URL` | ⬜ | Optional alternative live JSON feed. |

See [`.env.example`](./.env.example) for the full template.

### 🎯 Change the tipp group

Set `SRF_COMMUNITY_URL` to your community's URL — that's it. Find your community id in the URL on
`wmtippspiel.srf.ch/communities/<id>`. Everything (members, fixtures, leaderboards) follows automatically.

### Get the Firebase Admin key

Firebase Console → **Project Settings → Service accounts → Generate new private key**. Paste the
whole JSON into `FIREBASE_SERVICE_ACCOUNT` (one line). Keep it out of git — `.env*` is already gitignored.

---

## ☁️ Deploy (Vercel + free cron)

1. Push to GitHub and import the repo on **Vercel**.
2. Add the env vars above (Project → Settings → Environment Variables).
3. Create a **Firestore database** in the Firebase Console and paste [`firestore.rules`](./firestore.rules) into **Rules → Publish** (public read, all client writes denied; the Admin SDK bypasses rules).
4. After the first deploy, hit `/api/cron/sync?secret=YOUR_CRON_SECRET` once to seed data.
5. Schedule the jobs with a free scheduler such as [cron-job.org](https://cron-job.org):

   | Job | URL | Schedule |
   |---|---|---|
   | Live tick | `https://YOURAPP/api/cron/live?secret=…` | every **1 min** |
   | Full sync (safety net) | `https://YOURAPP/api/cron/sync?secret=…` | every **15 min** |

`vercel.json` also defines a daily Vercel cron as a fallback. The live tick is self-throttling — it only does real work while a match is in progress, and ESPN has no per-day cap.

> Any always-on Node host (Railway, Fly, a VPS) works too — just run `next start` and point a cron at the same routes.

---

## 🧮 Scoring rules

| | Outcome (win/draw) | Home goals | Away goals | Goal difference |
|---|---|---|---|---|
| **Group phase** | 5 | 1 | 1 | 3 |
| **Knockout** | 10 | 2 | 2 | 6 |

Goal-difference points require the correct difference **and**, for a win, the correct winner.
**Bonus:** 50 for the correct World Champion, 20 for each other correct Zusatzfrage. Logic lives in
[`src/lib/scoring.ts`](./src/lib/scoring.ts) and is unit-tested against SRF's published point breakdowns.

---

## 🗂️ Project structure

```
src/lib/srf/scraper.ts        SRF HTML scraping + parsing (data-react-props)
src/lib/scoring.ts            pure scoring engine (+ scoring.test.ts)
src/lib/live/espn.ts          ESPN live source + fixture matching
src/lib/sync/orchestrator.ts  full sync + live tick (scrape → score → write)
src/lib/data.ts               server reads (Firestore, with dev fallback)
src/data/teams.ts             WC2026 team reference (German ↔ ISO2 ↔ flag)
src/app/                      pages: home, /matches, /match/[id], /leaderboard, /bonus
src/app/api/cron/             secured cron routes
firestore.rules               paste into Firebase
```

### Adapting to other SRF Tippspiele / tournaments

The round → stage mapping (round 40 = bonus, 41–43 = group, 44+ = knockout) and the "Weltmeister"
champion detection live in [`src/lib/config.ts`](./src/lib/config.ts). For a non-World-Cup SRF
Tippspiel on the same platform, adjust those constants. The community/scraping logic is generic.

---

## 🛠️ Tech stack

Next.js 16 (App Router, React 19) · TypeScript · Tailwind CSS v4 · Firebase Firestore (Admin + Web SDK) ·
Cheerio · Vitest. Live data: ESPN public scoreboard. Flags: [flagcdn](https://flagcdn.com).

---

## ⚠️ Disclaimer

This project reads **publicly available** data from `wmtippspiel.srf.ch` and ESPN's public endpoints for
personal/community use. It is **not affiliated with, endorsed by, or operated by SRF/SRG SSR or ESPN**.
The scraper depends on SRF's current public HTML; if SRF changes it, update `src/lib/srf/scraper.ts`.
Please use respectfully (the built-in rate-limiting is there for a reason).

## 📄 License

[MIT](./LICENSE) © stefan-laux
