// Probe the ESPN scoreboard API to confirm reachability + inspect the live shape.
const URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
try {
  const res = await fetch(URL, { headers: { "User-Agent": "Mozilla/5.0" } });
  console.log("HTTP", res.status);
  const data = await res.json();
  const events = data.events ?? [];
  console.log(`EVENTS: ${events.length}  (leagues: ${(data.leagues||[]).map(l=>l.name).join(",")})`);
  for (const ev of events.slice(0, 8)) {
    const comp = ev.competitions?.[0];
    const cs = (comp?.competitors ?? []).map((c) => ({
      side: c.homeAway, name: c.team?.displayName, abbr: c.team?.abbreviation, score: c.score,
    }));
    console.log(JSON.stringify({
      date: ev.date,
      state: ev.status?.type?.state,
      detail: ev.status?.type?.shortDetail,
      clock: ev.status?.displayClock,
      clockNum: ev.status?.clock,
      competitors: cs,
    }));
  }
} catch (e) {
  console.error("FETCH FAILED:", e.message, e.cause?.code ?? "");
}
