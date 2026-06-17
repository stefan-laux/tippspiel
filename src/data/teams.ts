// WC2026 team reference data: maps SRF's German team names <-> ISO2 / FIFA code / flag.
// ISO2 is the primary join key between SRF (German names) and the football API (English).
// NOTE: England and Scotland both have ISO2 "gb" (no own country code) — disambiguate via
// fifaCode (ENG/SCO) or the flagcdn subdivision URL. Use `code` (fifaCode) as the unique id.

export interface TeamRef {
  english: string;
  german: string;
  germanAliases: string[];
  iso2: string;
  /** Unique FIFA/IOC 3-letter code — use this as the stable unique team id. */
  fifaCode: string;
  flagEmoji: string;
  /** flagcdn SVG url (uses gb-eng / gb-sct for the home nations). */
  flagcdn: string;
}

export const TEAMS: TeamRef[] = [
  { english: "USA", german: "Vereinigte Staaten", germanAliases: ["USA", "Vereinigte Staaten von Amerika", "Amerika"], iso2: "us", fifaCode: "USA", flagEmoji: "🇺🇸", flagcdn: "https://flagcdn.com/us.svg" },
  { english: "Canada", german: "Kanada", germanAliases: [], iso2: "ca", fifaCode: "CAN", flagEmoji: "🇨🇦", flagcdn: "https://flagcdn.com/ca.svg" },
  { english: "Mexico", german: "Mexiko", germanAliases: [], iso2: "mx", fifaCode: "MEX", flagEmoji: "🇲🇽", flagcdn: "https://flagcdn.com/mx.svg" },
  { english: "Argentina", german: "Argentinien", germanAliases: [], iso2: "ar", fifaCode: "ARG", flagEmoji: "🇦🇷", flagcdn: "https://flagcdn.com/ar.svg" },
  { english: "Brazil", german: "Brasilien", germanAliases: [], iso2: "br", fifaCode: "BRA", flagEmoji: "🇧🇷", flagcdn: "https://flagcdn.com/br.svg" },
  { english: "Colombia", german: "Kolumbien", germanAliases: [], iso2: "co", fifaCode: "COL", flagEmoji: "🇨🇴", flagcdn: "https://flagcdn.com/co.svg" },
  { english: "Ecuador", german: "Ecuador", germanAliases: ["Ekuador"], iso2: "ec", fifaCode: "ECU", flagEmoji: "🇪🇨", flagcdn: "https://flagcdn.com/ec.svg" },
  { english: "Paraguay", german: "Paraguay", germanAliases: [], iso2: "py", fifaCode: "PAR", flagEmoji: "🇵🇾", flagcdn: "https://flagcdn.com/py.svg" },
  { english: "Uruguay", german: "Uruguay", germanAliases: [], iso2: "uy", fifaCode: "URU", flagEmoji: "🇺🇾", flagcdn: "https://flagcdn.com/uy.svg" },
  { english: "Curaçao", german: "Curaçao", germanAliases: ["Curacao"], iso2: "cw", fifaCode: "CUW", flagEmoji: "🇨🇼", flagcdn: "https://flagcdn.com/cw.svg" },
  { english: "Haiti", german: "Haiti", germanAliases: [], iso2: "ht", fifaCode: "HAI", flagEmoji: "🇭🇹", flagcdn: "https://flagcdn.com/ht.svg" },
  { english: "Panama", german: "Panama", germanAliases: [], iso2: "pa", fifaCode: "PAN", flagEmoji: "🇵🇦", flagcdn: "https://flagcdn.com/pa.svg" },
  { english: "Australia", german: "Australien", germanAliases: [], iso2: "au", fifaCode: "AUS", flagEmoji: "🇦🇺", flagcdn: "https://flagcdn.com/au.svg" },
  { english: "Iran", german: "Iran", germanAliases: ["Islamische Republik Iran"], iso2: "ir", fifaCode: "IRN", flagEmoji: "🇮🇷", flagcdn: "https://flagcdn.com/ir.svg" },
  { english: "Iraq", german: "Irak", germanAliases: [], iso2: "iq", fifaCode: "IRQ", flagEmoji: "🇮🇶", flagcdn: "https://flagcdn.com/iq.svg" },
  { english: "Japan", german: "Japan", germanAliases: [], iso2: "jp", fifaCode: "JPN", flagEmoji: "🇯🇵", flagcdn: "https://flagcdn.com/jp.svg" },
  { english: "Jordan", german: "Jordanien", germanAliases: [], iso2: "jo", fifaCode: "JOR", flagEmoji: "🇯🇴", flagcdn: "https://flagcdn.com/jo.svg" },
  { english: "Qatar", german: "Katar", germanAliases: ["Qatar"], iso2: "qa", fifaCode: "QAT", flagEmoji: "🇶🇦", flagcdn: "https://flagcdn.com/qa.svg" },
  { english: "Saudi Arabia", german: "Saudi-Arabien", germanAliases: ["Saudi Arabien", "Saudiarabien"], iso2: "sa", fifaCode: "KSA", flagEmoji: "🇸🇦", flagcdn: "https://flagcdn.com/sa.svg" },
  { english: "South Korea", german: "Südkorea", germanAliases: ["Suedkorea", "Korea Republik", "Republik Korea"], iso2: "kr", fifaCode: "KOR", flagEmoji: "🇰🇷", flagcdn: "https://flagcdn.com/kr.svg" },
  { english: "Uzbekistan", german: "Usbekistan", germanAliases: [], iso2: "uz", fifaCode: "UZB", flagEmoji: "🇺🇿", flagcdn: "https://flagcdn.com/uz.svg" },
  { english: "Algeria", german: "Algerien", germanAliases: [], iso2: "dz", fifaCode: "ALG", flagEmoji: "🇩🇿", flagcdn: "https://flagcdn.com/dz.svg" },
  { english: "Cape Verde", german: "Kap Verde", germanAliases: ["Kapverden", "Kapverdische Inseln", "Cabo Verde"], iso2: "cv", fifaCode: "CPV", flagEmoji: "🇨🇻", flagcdn: "https://flagcdn.com/cv.svg" },
  { english: "DR Congo", german: "DR Kongo", germanAliases: ["Demokratische Republik Kongo", "Kongo", "Kongo (Dem. Rep.)", "Kongo, Dem. Republik"], iso2: "cd", fifaCode: "COD", flagEmoji: "🇨🇩", flagcdn: "https://flagcdn.com/cd.svg" },
  { english: "Egypt", german: "Ägypten", germanAliases: ["Aegypten"], iso2: "eg", fifaCode: "EGY", flagEmoji: "🇪🇬", flagcdn: "https://flagcdn.com/eg.svg" },
  { english: "Ghana", german: "Ghana", germanAliases: [], iso2: "gh", fifaCode: "GHA", flagEmoji: "🇬🇭", flagcdn: "https://flagcdn.com/gh.svg" },
  { english: "Ivory Coast", german: "Elfenbeinküste", germanAliases: ["Elfenbeinkueste", "Côte d'Ivoire", "Cote d'Ivoire"], iso2: "ci", fifaCode: "CIV", flagEmoji: "🇨🇮", flagcdn: "https://flagcdn.com/ci.svg" },
  { english: "Morocco", german: "Marokko", germanAliases: [], iso2: "ma", fifaCode: "MAR", flagEmoji: "🇲🇦", flagcdn: "https://flagcdn.com/ma.svg" },
  { english: "Senegal", german: "Senegal", germanAliases: [], iso2: "sn", fifaCode: "SEN", flagEmoji: "🇸🇳", flagcdn: "https://flagcdn.com/sn.svg" },
  { english: "South Africa", german: "Südafrika", germanAliases: ["Suedafrika"], iso2: "za", fifaCode: "RSA", flagEmoji: "🇿🇦", flagcdn: "https://flagcdn.com/za.svg" },
  { english: "Tunisia", german: "Tunesien", germanAliases: [], iso2: "tn", fifaCode: "TUN", flagEmoji: "🇹🇳", flagcdn: "https://flagcdn.com/tn.svg" },
  { english: "New Zealand", german: "Neuseeland", germanAliases: [], iso2: "nz", fifaCode: "NZL", flagEmoji: "🇳🇿", flagcdn: "https://flagcdn.com/nz.svg" },
  { english: "Austria", german: "Österreich", germanAliases: ["Oesterreich"], iso2: "at", fifaCode: "AUT", flagEmoji: "🇦🇹", flagcdn: "https://flagcdn.com/at.svg" },
  { english: "Belgium", german: "Belgien", germanAliases: [], iso2: "be", fifaCode: "BEL", flagEmoji: "🇧🇪", flagcdn: "https://flagcdn.com/be.svg" },
  { english: "Bosnia and Herzegovina", german: "Bosnien und Herzegowina", germanAliases: ["Bosnien-Herzegowina", "Bosnien-Herzeg.", "Bosnien"], iso2: "ba", fifaCode: "BIH", flagEmoji: "🇧🇦", flagcdn: "https://flagcdn.com/ba.svg" },
  { english: "Croatia", german: "Kroatien", germanAliases: [], iso2: "hr", fifaCode: "CRO", flagEmoji: "🇭🇷", flagcdn: "https://flagcdn.com/hr.svg" },
  { english: "Czech Republic", german: "Tschechien", germanAliases: ["Tschechische Republik"], iso2: "cz", fifaCode: "CZE", flagEmoji: "🇨🇿", flagcdn: "https://flagcdn.com/cz.svg" },
  { english: "England", german: "England", germanAliases: [], iso2: "gb", fifaCode: "ENG", flagEmoji: "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", flagcdn: "https://flagcdn.com/gb-eng.svg" },
  { english: "France", german: "Frankreich", germanAliases: [], iso2: "fr", fifaCode: "FRA", flagEmoji: "🇫🇷", flagcdn: "https://flagcdn.com/fr.svg" },
  { english: "Germany", german: "Deutschland", germanAliases: [], iso2: "de", fifaCode: "GER", flagEmoji: "🇩🇪", flagcdn: "https://flagcdn.com/de.svg" },
  { english: "Netherlands", german: "Niederlande", germanAliases: ["Holland"], iso2: "nl", fifaCode: "NED", flagEmoji: "🇳🇱", flagcdn: "https://flagcdn.com/nl.svg" },
  { english: "Norway", german: "Norwegen", germanAliases: [], iso2: "no", fifaCode: "NOR", flagEmoji: "🇳🇴", flagcdn: "https://flagcdn.com/no.svg" },
  { english: "Portugal", german: "Portugal", germanAliases: [], iso2: "pt", fifaCode: "POR", flagEmoji: "🇵🇹", flagcdn: "https://flagcdn.com/pt.svg" },
  { english: "Scotland", german: "Schottland", germanAliases: [], iso2: "gb", fifaCode: "SCO", flagEmoji: "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}", flagcdn: "https://flagcdn.com/gb-sct.svg" },
  { english: "Spain", german: "Spanien", germanAliases: [], iso2: "es", fifaCode: "ESP", flagEmoji: "🇪🇸", flagcdn: "https://flagcdn.com/es.svg" },
  { english: "Sweden", german: "Schweden", germanAliases: [], iso2: "se", fifaCode: "SWE", flagEmoji: "🇸🇪", flagcdn: "https://flagcdn.com/se.svg" },
  { english: "Switzerland", german: "Schweiz", germanAliases: [], iso2: "ch", fifaCode: "SUI", flagEmoji: "🇨🇭", flagcdn: "https://flagcdn.com/ch.svg" },
  { english: "Turkey", german: "Türkei", germanAliases: ["Tuerkei", "Türkiye"], iso2: "tr", fifaCode: "TUR", flagEmoji: "🇹🇷", flagcdn: "https://flagcdn.com/tr.svg" },
];

/** Normalize a name for fuzzy matching: lowercase, strip diacritics/umlauts, collapse punctuation. */
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip remaining accents
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Build a lookup from every known spelling (german, aliases, english) -> TeamRef.
const NAME_INDEX: Map<string, TeamRef> = (() => {
  const m = new Map<string, TeamRef>();
  for (const t of TEAMS) {
    for (const n of [t.german, t.english, ...t.germanAliases]) {
      m.set(normalizeTeamName(n), t);
    }
  }
  return m;
})();

const FIFA_INDEX: Map<string, TeamRef> = new Map(TEAMS.map((t) => [t.fifaCode.toLowerCase(), t]));

// Sorted (normalizedName, team) pairs for the prefix fallback below.
const NAME_PAIRS: [string, TeamRef][] = [...NAME_INDEX.entries()];

/** Resolve a team by any German/English spelling (e.g. SRF's "Südafrika"). */
export function findTeamByName(name: string | null | undefined): TeamRef | undefined {
  if (!name) return undefined;
  const q = normalizeTeamName(name);
  if (!q) return undefined;
  const exact = NAME_INDEX.get(q);
  if (exact) return exact;

  // Fallback for SRF abbreviations/truncations (e.g. "Bosnien-Herzeg." -> "bosnien herzeg"):
  // a known full name that starts with the query, resolving to exactly one team.
  if (q.length >= 5) {
    const hits = new Set<TeamRef>();
    for (const [full, team] of NAME_PAIRS) {
      if (full.startsWith(q) || q.startsWith(full)) hits.add(team);
    }
    if (hits.size === 1) return [...hits][0];
  }
  return undefined;
}

/** Resolve a team by FIFA code (e.g. "RSA"). */
export function findTeamByFifa(code: string | null | undefined): TeamRef | undefined {
  if (!code) return undefined;
  return FIFA_INDEX.get(code.toLowerCase());
}

/**
 * Resolve a team coming from the football API, which may give an English name and/or a 3-letter code.
 * Tries code first (most reliable), then name.
 */
export function findTeamByApi(name?: string | null, code?: string | null): TeamRef | undefined {
  return findTeamByFifa(code) ?? findTeamByName(name);
}
