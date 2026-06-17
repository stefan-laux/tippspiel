import clsx from "clsx";
import type { MatchStatus } from "@/lib/types";

export function LiveDot({ className }: { className?: string }) {
  return <span className={clsx("live-dot inline-block w-2 h-2 rounded-full bg-live", className)} />;
}

export function StatusBadge({
  status,
  detail,
  className,
}: {
  status: MatchStatus;
  /** e.g. live minute "67'" or "HT". */
  detail?: string | null;
  className?: string;
}) {
  if (status === "LIVE") {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2.5 py-1 text-xs font-bold text-live",
          className,
        )}
      >
        <LiveDot />
        {detail || "LIVE"}
      </span>
    );
  }
  if (status === "FINISHED") {
    return (
      <span
        className={clsx(
          "inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted",
          className,
        )}
      >
        Beendet
      </span>
    );
  }
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent",
        className,
      )}
    >
      {detail || "Bald"}
    </span>
  );
}

export function RankBadge({ rank, className }: { rank: number; className?: string }) {
  const medal =
    rank === 1
      ? "bg-gold/20 text-gold ring-gold/40"
      : rank === 2
        ? "bg-silver/20 text-silver ring-silver/40"
        : rank === 3
          ? "bg-bronze/20 text-bronze ring-bronze/40"
          : "bg-surface-2 text-muted ring-border";
  return (
    <span
      className={clsx(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ring-1 tabular-nums",
        medal,
        className,
      )}
    >
      {rank}
    </span>
  );
}

export function Pill({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent" | "live";
  className?: string;
}) {
  const tones = {
    muted: "bg-surface-2 text-muted",
    accent: "bg-accent/15 text-accent",
    live: "bg-live/15 text-live",
  };
  return (
    <span className={clsx("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
