import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { EnvelopeOpenIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../auth/AuthProvider";
import { Alert, Button, Field, Input, Spinner } from "../../components/ui";
import { forgotPassword, resetPassword, verifyEmail } from "../../services/auth.service";
import { errorMessage } from "../../utils/problems";
import { forgotPasswordSchema, type ForgotPasswordValues, resetPasswordSchema, type ResetPasswordValues } from "../../validation/auth.schemas";
import { AuthShell } from "./AuthShell";

export function CheckEmailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const email = (useLocation().state as { email?: string } | null)?.email ?? "";

  return (
    <AuthShell title={t("auth.checkEmailTitle")}>
      <div className="flex flex-col items-center gap-4 text-center">
        <EnvelopeOpenIcon className="h-14 w-14 text-monkii-500" />
        <p className="text-sm text-muted">{t("auth.checkEmailBody", { email })}</p>
        <Button size="lg" className="w-full" onClick={() => navigate("/", { replace: true })}>
          {t("auth.checkEmailContinue")}
        </Button>
      </div>
    </AuthShell>
  );
}

/** Landing page of the link sent by email (AUTH-03). */
export function VerifyEmailPage() {
  const { t } = useTranslation();
  const { user, reload } = useAuth();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"pending" | "done" | "failed">("pending");
  const sent = useRef(false); // StrictMode runs effects twice in development

  useEffect(() => {
    const token = params.get("token");
    if (!token || sent.current) return;
    sent.current = true;

    verifyEmail(token)
      .then(async () => {
        setStatus("done");
        if (user) await reload(); // new access token with the verified flag
      })
      .catch(() => setStatus("failed"));
  }, [params, user, reload]);

  return (
    <AuthShell title={t("auth.verifyTitle")}>
      <div className="flex flex-col items-center gap-4 text-center">
        {status === "pending" && <Spinner className="h-8 w-8 text-monkii-500" />}
        {status === "done" && <Alert tone="success">{t("auth.verified")}</Alert>}
        {status === "failed" && <Alert>{t("auth.verifyFailed")}</Alert>}
        {status !== "pending" && (
          <Link to={user ? "/" : "/login"} className="font-semibold text-monkii-400 hover:underline">
            {user ? t("common.goHome") : t("common.signIn")}
          </Link>
        )}
      </div>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    await forgotPassword(email, i18n.language === "fr" ? "fr" : "en").catch(() => undefined);
    setSent(true);
  });

  return (
    <AuthShell title={t("auth.resetTitle")} subtitle={t("auth.resetSubtitle")} footer={<Link to="/login" className="font-semibold text-monkii-400 hover:underline">{t("common.signIn")}</Link>}>
      {sent ? (
        <Alert tone="success">{t("auth.resetSent")}</Alert>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field label={t("auth.email")} error={formState.errors.email && t("auth.email")}>
            <Input type="email" autoComplete="email" autoFocus {...register("email")} />
          </Field>
          <Button type="submit" size="lg" loading={formState.isSubmitting}>{t("auth.sendLink")}</Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await resetPassword(params.get("token") ?? "", password);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <AuthShell title={t("auth.choosePassword")}>
      {done ? (
        <div className="flex flex-col gap-4">
          <Alert tone="success">{t("auth.resetDone")}</Alert>
          <Link to="/login" className="text-center font-semibold text-monkii-400 hover:underline">{t("common.signIn")}</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {error && <Alert>{error}</Alert>}
          <Field label={t("auth.newPassword")} hint={t("auth.passwordHint")} error={formState.errors.password && t("auth.passwordHint")}>
            <Input type="password" autoComplete="new-password" autoFocus {...register("password")} />
          </Field>
          <Button type="submit" size="lg" loading={formState.isSubmitting}>{t("common.save")}</Button>
        </form>
      )}
    </AuthShell>
  );
}
