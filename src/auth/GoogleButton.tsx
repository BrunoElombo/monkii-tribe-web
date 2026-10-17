import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Alert } from "../components/ui";
import { useAuthProviders } from "../hooks/auth";
import { errorMessage } from "../utils/problems";
import { getTheme } from "../utils/theme";
import { useAuth } from "./AuthProvider";

/** The parts of Google Identity Services we use. */
interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: "popup" }): void;
      renderButton(element: HTMLElement, options: Record<string, string | number>): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let scriptLoading: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  scriptLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoading = null;
      reject(new Error("Google sign-in could not be loaded"));
    };
    document.head.appendChild(script);
  });
  return scriptLoading;
}

/**
 * "Continue with Google" (AUTH-09). Hidden until the platform has a Google
 * client id. New accounts are sent to their settings to finish the profile
 * (birth date, gender, region), which Google does not provide.
 */
export function GoogleButton() {
  const { t, i18n } = useTranslation();
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const providers = useAuthProviders();
  const clientId = providers.data?.google?.clientId;

  useEffect(() => {
    if (!clientId || !container.current) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google || !container.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: "popup",
          callback: async ({ credential }) => {
            setError(null);
            try {
              const { isNew } = await loginWithGoogle(credential);
              const from = (location.state as { from?: string } | null)?.from;
              navigate(isNew ? "/settings?complete=1" : from && from !== "/login" ? from : "/", { replace: true });
            } catch (err) {
              setError(errorMessage(err));
            }
          },
        });
        window.google.accounts.id.renderButton(container.current, {
          type: "standard",
          theme: getTheme() === "dark" ? "filled_black" : "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 320,
          locale: i18n.language,
        });
      })
      .catch((err: Error) => setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [clientId, i18n.language, loginWithGoogle, navigate, location.state]);

  if (!clientId) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center gap-3 text-xs uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-line" />
        {t("auth.or")}
        <span className="h-px flex-1 bg-line" />
      </div>
      <div ref={container} className="min-h-11" />
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
