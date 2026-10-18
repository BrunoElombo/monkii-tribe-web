import clsx from "clsx";
import logoUrl from "../assets/monkii-logo.webp";

const SIZES = {
  md: { mark: "h-10 w-10", text: "text-xl", px: 40 },
  // Sign-in pages: the gorilla is detailed, give it room
  lg: { mark: "h-16 w-16", text: "text-3xl", px: 64 },
};

/** The gorilla mark (with its cream sticker border, so it reads on dark screens) + wordmark in Stack Sans Notch. */
export function Logo({ className, compact = false, size = "md" }: { className?: string; compact?: boolean; size?: keyof typeof SIZES }) {
  const { mark, text, px } = SIZES[size];
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      {/* The wordmark already says the name; the mark alone needs it for screen readers */}
      <img src={logoUrl} alt={compact ? "Monkii Tribe" : ""} width={px} height={px} className={clsx(mark, "shrink-0")} />
      {!compact && (
        <span className={clsx("font-logo font-bold tracking-tight", text)}>
          Monkii <span className="text-monkii-500">Tribe</span>
        </span>
      )}
    </span>
  );
}
