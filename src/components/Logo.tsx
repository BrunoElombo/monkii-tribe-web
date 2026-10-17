import clsx from "clsx";

/** Brand mark + wordmark in Stack Sans Notch. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FB923C" />
            <stop offset="1" stopColor="#C2410C" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#logo-gradient)" />
        <polyline points="14,46 14,22 32,38 50,22 50,46" fill="none" stroke="#FFF7ED" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="15" r="4" fill="#FFF7ED" />
      </svg>
      {!compact && (
        <span className="font-logo text-xl font-bold tracking-tight">
          Monkii <span className="text-monkii-500">Tribe</span>
        </span>
      )}
    </span>
  );
}
