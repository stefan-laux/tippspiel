import type { TeamInfo } from "@/lib/types";
import clsx from "clsx";

const SIZES = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-11 h-11",
  xl: "w-14 h-14",
} as const;

export function Flag({
  team,
  size = "md",
  className,
}: {
  team: TeamInfo | { flag?: string; name: string };
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const base = clsx(SIZES[size], "shrink-0 rounded-full object-cover ring-1 ring-border/70 bg-surface-2", className);
  if (team.flag) {
    // Plain <img> (flagcdn SVG) to avoid next/image remote config.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.flag} alt={team.name} className={base} loading="lazy" />;
  }
  return (
    <span
      className={clsx(base, "inline-flex items-center justify-center text-muted text-xs font-semibold")}
      aria-label={team.name}
      title={team.name}
    >
      {initials(team.name)}
    </span>
  );
}

function initials(name: string): string {
  const cleaned = name.replace(/[^A-Za-zÀ-ÿ ]/g, "").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
