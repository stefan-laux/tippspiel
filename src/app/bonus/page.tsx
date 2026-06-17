import { Pill } from "@/components/badges";
import { getBonusQuestions, getBonusAnswers } from "@/lib/data";
import { groupBy } from "@/lib/util";
import clsx from "clsx";

export const dynamic = "force-dynamic";

export default async function BonusPage() {
  const [questions, answers] = await Promise.all([getBonusQuestions(), getBonusAnswers()]);
  const byQuestion = groupBy(answers, (a) => a.questionId);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Zusatzfragen</h1>
      <p className="mb-5 text-sm text-muted">
        Weltmeister-Tipp 50 Punkte · jede weitere richtige Antwort 20 Punkte.
      </p>

      {questions.length === 0 && <p className="py-10 text-center text-sm text-muted">Keine Zusatzfragen geladen.</p>}

      <div className="space-y-4">
        {questions.map((q) => {
          const ans = [...(byQuestion.get(q.id) ?? [])].sort(
            (a, b) => b.pointsAwarded - a.pointsAwarded || a.displayName.localeCompare(b.displayName),
          );
          return (
            <section key={q.id} className={clsx("card p-4", q.type === "champion" && "ring-1 ring-gold/30")}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    Zusatzfrage {q.order}
                  </div>
                  <h2 className="font-bold leading-snug">{q.question}</h2>
                </div>
                <Pill tone={q.type === "champion" ? "accent" : "muted"} className="shrink-0">
                  {q.points} Pkt
                </Pill>
              </div>

              {q.resolved ? (
                <div className="mb-3 rounded-lg bg-accent/10 px-3 py-2 text-sm">
                  <span className="text-muted">Richtige Antwort: </span>
                  <span className="font-semibold text-accent">{q.correctAnswerName}</span>
                </div>
              ) : (
                <div className="mb-3 text-xs text-muted">Noch nicht aufgelöst.</div>
              )}

              <ul className="divide-y divide-border">
                {ans.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.displayName}</span>
                    <span
                      className={clsx(
                        "truncate text-sm",
                        a.awarded ? "font-semibold text-accent" : "text-muted",
                      )}
                    >
                      {a.answerName}
                    </span>
                    {q.resolved && (
                      <span
                        className={clsx(
                          "w-12 shrink-0 text-right text-sm font-bold tabular-nums",
                          a.awarded ? "text-accent" : "text-faint",
                        )}
                      >
                        {a.awarded ? `+${a.pointsAwarded}` : "0"}
                      </span>
                    )}
                  </li>
                ))}
                {ans.length === 0 && <li className="py-2 text-sm text-muted">Keine Antworten.</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
