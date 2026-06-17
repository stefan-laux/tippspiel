// Client-safe formatting helpers (no server-only imports).

const TZ = "Europe/Zurich";
const LOCALE = "de-CH";

export function formatTime(ms: number): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(ms);
}

export function formatDateShort(ms: number): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: TZ }).format(ms);
}

export function formatDateTime(ms: number): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short", timeZone: TZ }).format(ms);
}

export function formatWeekday(ms: number): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: TZ }).format(ms);
}

/** "Heute" / "Morgen" / "Mi, 24. Juni" relative to now. */
export function relativeDay(ms: number, now = Date.now()): string {
  if (!ms) return "";
  const d = new Date(ms);
  const startOf = (t: number) => {
    const x = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(t));
    return x.getTime();
  };
  const days = Math.round((startOf(ms) - startOf(now)) / 86_400_000);
  if (days === 0) return "Heute";
  if (days === 1) return "Morgen";
  if (days === -1) return "Gestern";
  return new Intl.DateTimeFormat(LOCALE, { weekday: "short", day: "numeric", month: "short", timeZone: TZ }).format(d);
}

export function score(h: number | null | undefined, a: number | null | undefined): string {
  if (h == null || a == null) return "–:–";
  return `${h}:${a}`;
}

export function tip(h: number, a: number): string {
  return `${h}:${a}`;
}

/** "in 2 Std 15 Min" / "in 3 Tagen" style countdown text. */
export function untilText(ms: number, now = Date.now()): string {
  const diff = ms - now;
  if (diff <= 0) return "";
  const mins = Math.floor(diff / 60_000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days > 0) return `in ${days} ${days === 1 ? "Tag" : "Tagen"}${hours ? ` ${hours} Std` : ""}`;
  if (hours > 0) return `in ${hours} Std ${m} Min`;
  return `in ${m} Min`;
}
