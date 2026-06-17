import { describe, it, expect } from "vitest";
import { scorePrediction, scoreBonus, outcomeOf } from "./scoring";

describe("outcomeOf", () => {
  it("classifies tendencies", () => {
    expect(outcomeOf(2, 0)).toBe("H");
    expect(outcomeOf(1, 1)).toBe("D");
    expect(outcomeOf(0, 3)).toBe("A");
  });
});

describe("scorePrediction — SRF ground truth (group phase, 5/1/1/3)", () => {
  // Captured from a real SRF ScoreBet block: pick 2:0, result 2:0 ->
  // scores {winner:5, home:1, away:1, difference:3}, total 10.
  it("exact correct group prediction = 10 (matches SRF)", () => {
    expect(scorePrediction(false, [2, 0], [2, 0])).toEqual({
      outcome: 5,
      home: 1,
      away: 1,
      diff: 3,
      total: 10,
    });
  });

  it("correct tendency + correct goal difference, wrong exact = 8", () => {
    // predict 2:1, actual 3:2 -> home win both, diff +1 both, no exact goals
    expect(scorePrediction(false, [2, 1], [3, 2])).toEqual({
      outcome: 5,
      home: 0,
      away: 0,
      diff: 3,
      total: 8,
    });
  });

  it("any-score draw earns outcome + difference (diff 0)", () => {
    // predict 2:2, actual 0:0 -> draw tendency + diff 0 both
    expect(scorePrediction(false, [2, 2], [0, 0])).toEqual({
      outcome: 5,
      home: 0,
      away: 0,
      diff: 3,
      total: 8,
    });
  });

  it("exact draw = full points", () => {
    expect(scorePrediction(false, [1, 1], [1, 1])).toEqual({
      outcome: 5,
      home: 1,
      away: 1,
      diff: 3,
      total: 10,
    });
  });

  it("right magnitude but WRONG winner gives no difference points", () => {
    // predict 2:1 (home by 1), actual 1:2 (away by 1): same |diff| but opposite winner
    expect(scorePrediction(false, [2, 1], [1, 2])).toEqual({
      outcome: 0,
      home: 0, // 2 != 1
      away: 0, // 1 != 2
      diff: 0, // magnitude matches but winner wrong -> 0
      total: 0,
    });
  });

  it("one exact goal count but wrong tendency", () => {
    // predict 1:0 (home win), actual 1:3 (away win): home goals exact (1), nothing else
    expect(scorePrediction(false, [1, 0], [1, 3])).toEqual({
      outcome: 0,
      home: 1,
      away: 0,
      diff: 0,
      total: 1,
    });
  });

  it("correct tendency only (win, wrong margin)", () => {
    // predict 3:0 (home, diff 3), actual 1:0 (home, diff 1)
    expect(scorePrediction(false, [3, 0], [1, 0])).toEqual({
      outcome: 5,
      home: 0,
      away: 1, // 0 == 0
      diff: 0,
      total: 6,
    });
  });
});

describe("scorePrediction — knockout phase (10/2/2/6)", () => {
  it("exact correct knockout prediction = 20", () => {
    expect(scorePrediction(true, [2, 1], [2, 1])).toEqual({
      outcome: 10,
      home: 2,
      away: 2,
      diff: 6,
      total: 20,
    });
  });

  it("tendency + difference only in knockout = 16", () => {
    expect(scorePrediction(true, [2, 1], [3, 2])).toEqual({
      outcome: 10,
      home: 0,
      away: 0,
      diff: 6,
      total: 16,
    });
  });

  it("wrong winner, same magnitude = 0 in knockout", () => {
    expect(scorePrediction(true, [1, 2], [2, 1])).toEqual({
      outcome: 0,
      home: 0,
      away: 0,
      diff: 0,
      total: 0,
    });
  });
});

describe("scoreBonus", () => {
  it("champion correct = 50", () => {
    expect(scoreBonus(true, "245", "245")).toBe(50);
  });
  it("champion wrong = 0", () => {
    expect(scoreBonus(true, "208", "245")).toBe(0);
  });
  it("other correct = 20", () => {
    expect(scoreBonus(false, "12", "12")).toBe(20);
  });
  it("unresolved (no correct answer yet) = 0", () => {
    expect(scoreBonus(true, "245", null)).toBe(0);
    expect(scoreBonus(false, null, "12")).toBe(0);
  });
});
