"use client";
import { useEffect, useState } from "react";

function parts(diff: number) {
  const total = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return { days, hours, mins, secs, total };
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="min-w-[2.4ch] rounded-lg bg-surface-2 px-2 py-1.5 text-center text-xl font-extrabold tabular-nums sm:text-2xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

export function Countdown({ targetMs, onElapsed }: { targetMs: number; onElapsed?: () => void }) {
  // Start as null so SSR and the first client render match (no clock baked into HTML);
  // the real countdown begins once mounted, avoiding a hydration mismatch.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (now != null && targetMs - now <= 0) onElapsed?.();
  }, [now, targetMs, onElapsed]);

  if (now == null) return <span className="text-sm font-semibold text-muted tabular-nums">–:–:–</span>;

  const { days, hours, mins, secs, total } = parts(targetMs - now);
  if (total <= 0) return <span className="text-sm font-semibold text-accent">Anpfiff!</span>;

  return (
    <div className="flex items-center gap-2">
      {days > 0 && <Cell value={days} label="Tage" />}
      <Cell value={hours} label="Std" />
      <Cell value={mins} label="Min" />
      {days === 0 && <Cell value={secs} label="Sek" />}
    </div>
  );
}
