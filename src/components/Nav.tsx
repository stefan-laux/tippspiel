"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Start", icon: HomeIcon },
  { href: "/leaderboard", label: "Rangliste", icon: TrophyIcon },
  { href: "/matches", label: "Spiele", icon: BallIcon },
  { href: "/bonus", label: "Bonus", icon: StarIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 px-3 pt-3">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 rounded-2xl border border-border bg-surface/80 px-2 pl-3 shadow-lg shadow-black/30 backdrop-blur-xl">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-fg text-lg shadow-sm shadow-accent/30">
            ⚽
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-extrabold tracking-tight text-fg">
              WM<span className="text-accent">26</span> Tipps
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-muted sm:block">
              SRF Tippspiel
            </span>
          </span>
        </Link>

        {/* Nav — always visible; icon-only on mobile, icon + label on desktop */}
        <nav className="flex items-center gap-1 rounded-xl bg-bg/40 p-1">
          {LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-label={l.label}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors sm:px-3",
                  active
                    ? "bg-surface-2 text-fg shadow-sm ring-1 ring-border"
                    : "text-muted hover:bg-surface-2/50 hover:text-fg",
                )}
              >
                <Icon className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

type IconProps = { className?: string };
function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function TrophyIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12v3a6 6 0 0 1-12 0V4Z" /><path d="M6 6H3v1a4 4 0 0 0 4 4M18 6h3v1a4 4 0 0 1-4 4M9 16h6M10 20h4M12 16v4" />
    </svg>
  );
}
function BallIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="m12 7 3 2.2-1.1 3.5h-3.8L9 9.2 12 7Z" />
    </svg>
  );
}
function StarIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 2.9 5.9 6.1.9-4.5 4.4 1.1 6.1L12 17.8 6.4 20.3l1.1-6.1L3 9.8l6.1-.9L12 3Z" />
    </svg>
  );
}
