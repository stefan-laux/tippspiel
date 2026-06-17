// Firestore collection / document names, in one place.
export const COL = {
  meta: "meta",
  users: "users",
  fixtures: "fixtures",
  tips: "tips",
  liveState: "liveState",
  matchLeaderboards: "matchLeaderboards",
  liveMatchLeaderboards: "liveMatchLeaderboards",
  leaderboards: "leaderboards",
  bonusQuestions: "bonusQuestions",
  bonusAnswers: "bonusAnswers",
} as const;

export const DOC = {
  community: "community", // meta/community
  overall: "overall", // leaderboards/overall
  live: "live", // leaderboards/live
  health: "health", // meta/health (cron heartbeat)
} as const;

export function tipId(fixtureId: string, userId: string): string {
  return `${fixtureId}__${userId}`;
}

export function bonusAnswerId(questionId: string, userId: string): string {
  return `${questionId}__${userId}`;
}
