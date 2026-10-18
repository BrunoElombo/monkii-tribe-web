import { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "../../components/Logo";

/** Centered card used by every sign-in / sign-up screen. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--color-monkii-900)_0%,_transparent_60%)] px-4 py-10">
      <Link to="/" className="mb-8">
        <Logo size="lg" />
      </Link>
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
    </div>
  );
}
