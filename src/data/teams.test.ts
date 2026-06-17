import { describe, it, expect } from "vitest";
import { findTeamByName, findTeamByApi, TEAMS } from "./teams";

// The exact 48 German names SRF renders (harvested from rounds 41-43 of the live site).
const SRF_NAMES = [
  "Algerien", "Argentinien", "Australien", "Belgien", "Bosnien-Herzeg.", "Brasilien",
  "Curaçao", "DR Kongo", "Deutschland", "Ecuador", "Elfenbeinküste", "England",
  "Frankreich", "Ghana", "Haiti", "Irak", "Iran", "Japan", "Jordanien", "Kanada",
  "Kap Verde", "Katar", "Kolumbien", "Kroatien", "Marokko", "Mexiko", "Neuseeland",
  "Niederlande", "Norwegen", "Panama", "Paraguay", "Portugal", "Saudi-Arabien",
  "Schottland", "Schweden", "Schweiz", "Senegal", "Spanien", "Südafrika", "Südkorea",
  "Tschechien", "Tunesien", "Türkei", "USA", "Uruguay", "Usbekistan", "Ägypten", "Österreich",
];

describe("team name resolution", () => {
  it("resolves every SRF German name to a team with iso2 + flag", () => {
    const unresolved: string[] = [];
    for (const name of SRF_NAMES) {
      const t = findTeamByName(name);
      if (!t || !t.iso2 || !t.flagcdn) unresolved.push(name);
    }
    expect(unresolved).toEqual([]);
  });

  it("resolves the abbreviation via prefix fallback", () => {
    expect(findTeamByName("Bosnien-Herzeg.")?.fifaCode).toBe("BIH");
  });

  it("distinguishes England and Scotland (both iso2 gb)", () => {
    expect(findTeamByName("England")?.fifaCode).toBe("ENG");
    expect(findTeamByName("Schottland")?.fifaCode).toBe("SCO");
  });

  it("resolves football-API style by code then name", () => {
    expect(findTeamByApi("South Africa", "RSA")?.iso2).toBe("za");
    expect(findTeamByApi("Switzerland", null)?.iso2).toBe("ch");
  });

  it("has 48 teams", () => {
    expect(TEAMS.length).toBe(48);
  });
});
