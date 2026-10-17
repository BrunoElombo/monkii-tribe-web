import { ButtonHTMLAttributes, forwardRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

// ---------------------------------------------------------------- buttons

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-monkii-500 text-monkii-ink hover:bg-monkii-400 active:bg-monkii-600",
  secondary: "border border-line bg-surface text-fg hover:border-monkii-500/60",
  ghost: "text-muted hover:bg-elevated/60 hover:text-fg",
  danger: "border border-monkii-700 text-monkii-300 hover:bg-monkii-900/60",
};

const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon}
      {children}
    </button>
  );
});

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx("inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-elevated/70 hover:text-fg disabled:opacity-40", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- form fields

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, error, hint, optional, children, className }: FieldProps) {
  const { t } = useTranslation();
  return (
    <label className={clsx("block", className)}>
      <span className="label">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">({t("common.optional")})</span>}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-xs font-medium text-monkii-300">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={clsx("input", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={clsx("input min-h-24 resize-y", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={clsx("input appearance-none bg-[length:16px] pr-9", className)} {...rest}>
      {children}
    </select>
  );
});

// forwardRef so react-hook-form's register() can read the checked state
export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }>(function Checkbox(
  { label, ...rest },
  ref,
) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input ref={ref} type="checkbox" className="mt-0.5 h-4 w-4 accent-monkii-500" {...rest} />
      <span>{label}</span>
    </label>
  );
});

// ---------------------------------------------------------------- feedback

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx("animate-spin text-current", className ?? "h-5 w-5")} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-monkii-500">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "info" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "error" && "border-monkii-700 bg-monkii-950/60 text-monkii-200",
        tone === "info" && "border-line bg-elevated/40 text-fg",
        tone === "success" && "border-monkii-500/50 bg-monkii-500/10 text-fg",
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, action }: { icon?: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-12 text-center text-muted">
      {icon && <div className="text-monkii-500 [&>svg]:h-10 [&>svg]:w-10">{icon}</div>}
      <p className="max-w-sm text-sm">{title}</p>
      {action}
    </div>
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "strong" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "muted" && "bg-elevated text-muted",
        tone === "accent" && "bg-monkii-500/15 text-monkii-300",
        tone === "strong" && "bg-monkii-500 text-monkii-ink",
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {action}
    </div>
  );
}
