import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../auth/AuthProvider";
import { GoogleButton } from "../../auth/GoogleButton";
import { Alert, Button, Field, Input } from "../../components/ui";
import { errorMessage } from "../../utils/problems";
import { loginSchema, type LoginValues } from "../../validation/auth.schemas";
import { AuthShell } from "./AuthShell";

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      await login(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== "/login" ? from : "/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <AuthShell
      title={t("auth.welcomeBack")}
      subtitle={t("auth.signInSubtitle")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="font-semibold text-monkii-400 hover:underline">{t("common.signUp")}</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error && <Alert>{error}</Alert>}

        <Field label={t("auth.email")} error={formState.errors.email && t("auth.email")}>
          <Input type="email" autoComplete="email" autoFocus {...register("email")} />
        </Field>

        <Field label={t("auth.password")}>
          <Input type="password" autoComplete="current-password" {...register("password")} />
        </Field>

        <Link to="/forgot-password" className="-mt-2 self-end text-xs font-semibold text-monkii-400 hover:underline">
          {t("auth.forgotPassword")}
        </Link>

        <Button type="submit" size="lg" loading={formState.isSubmitting}>
          {t("common.signIn")}
        </Button>
      </form>
      <div className="mt-6"><GoogleButton /></div>
    </AuthShell>
  );
}
