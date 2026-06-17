// Harvest the exact German team names SRF renders (group rounds 41-43), so we can
// verify our name->ISO2 mapping covers every real spelling/abbreviation.
import * as cheerio from "cheerio";
const BASE = "https://wmtippspiel.srf.ch";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
async function get(url) { const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); }
function decode(s){return s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");}
function blocks($){const o=[];$("[data-react-class]").each((_,el)=>{const raw=$(el).attr("data-react-props");if(!raw)return;let p;try{p=JSON.parse(raw);}catch{try{p=JSON.parse(decode(raw));}catch{return;}}o.push(p);});return o;}
const names = new Set();
for (const round of [41, 42, 43]) {
  const html = await get(`${BASE}/users/mBqL/round/${round}`);
  const $ = cheerio.load(html);
  for (const p of blocks($)) {
    const bet = p?.bet; if (!bet || bet.type !== "score") continue;
    for (const t of bet.teams || []) if (t?.name) names.add(t.name);
  }
}
console.log(`UNIQUE TEAM NAMES (${names.size}):`);
console.log([...names].sort().join("\n"));
