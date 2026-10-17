import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../auth/AuthProvider";
import { Avatar } from "../components/Cover";
import { ImageUpload } from "../components/ImageUpload";
import { LocationFields } from "../components/LocationFields";
import { Alert, Button, Field, Input, PageLoader, Select } from "../components/ui";
import { useProfile } from "../hooks/user";
import { LANGUAGES, LanguageCode, setLanguage } from "../i18n";
import { changeAccountType, deleteAccount, logoutEverywhere, resendVerification } from "../services/auth.service";
import { updateMyProfile } from "../services/user.service";
import type { Profile } from "../types";
import { errorMessage } from "../utils/problems";
import { applyTheme, getTheme, Theme } from "../utils/theme";
import { listenerProfileSchema, type ListenerProfileValues } from "../validation/profile.schemas";
import { CompleteProfileSection, ExportSection, PushSection, SubscriptionSection } from "./SettingsSections";

export function SettingsPage() {
  const { t } = useTranslation();
  const profile = useProfile();
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="text-3xl font-semibold">{t("settings.title")}</h1>
      {profile.data && <CompleteProfileSection profile={profile.data} />}
      <ProfileSection />
      <SubscriptionSection />
      <PushSection />
      <AppearanceSection />
      <ExportSection />
      <AccountSection />
    </div>
  );
}

// ---------------------------------------------------------------- profile (ACC-02)

type ProfileForm = ListenerProfileValues;

function ProfileSection() {
  const { t } = useTranslation();
  const profile = useProfile();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (body: Partial<Profile>) => updateMyProfile(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      setSaved(true);
    },
  });

  const { register, handleSubmit, watch, reset, formState } = useForm<ProfileForm>({ resolver: zodResolver(listenerProfileSchema) });

  useEffect(() => {
    if (profile.data) reset({ ...profile.data, city: profile.data.city ?? "" });
  }, [profile.data, reset]);

  if (profile.isPending) return <PageLoader />;
  if (!profile.data) return null;

  return (
    <section className="card p-6">
      <h2 className="mb-4 text-lg font-semibold">{t("settings.profile")}</h2>

      <div className="mb-6 flex items-center gap-4">
        <ImageUpload purpose="AVATAR" label={t("settings.changeAvatar")} className="w-24" onUploaded={(asset) => save.mutate({ avatarUrl: asset.variants?.["300"] ?? null })}>
          <Avatar src={profile.data.avatarUrl} alt={t("settings.avatar")} className="w-24" />
        </ImageUpload>
        <p className="text-sm text-muted">{t("settings.avatar")}</p>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) => {
          setSaved(false);
          save.mutate({ ...values, city: values.city || null });
        })}
        noValidate
      >
        {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
        <Field label={t("auth.displayName")} error={formState.errors.displayName && t("auth.displayNameHint")}>
          <Input {...register("displayName")} />
        </Field>
        <Field label={t("auth.gender")}>
          <Select {...register("gender")}>
            {(["FEMALE", "MALE", "NON_BINARY", "UNDISCLOSED"] as const).map((g) => <option key={g} value={g}>{t(`auth.genders.${g}`)}</option>)}
          </Select>
        </Field>
        <LocationFields register={register} watch={watch} errors={formState.errors} />
        <div className="flex items-center gap-3">
          <Button type="submit" loading={save.isPending}>{t("common.save")}</Button>
          {saved && <span className="text-sm text-monkii-400">{t("common.saved")}</span>}
        </div>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------- appearance & language

function AppearanceSection() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<Theme>(getTheme());

  return (
    <section className="card grid gap-4 p-6 sm:grid-cols-2">
      <h2 className="text-lg font-semibold sm:col-span-2">{t("settings.appearance")}</h2>
      <Field label={t("settings.theme")}>
        <Select
          value={theme}
          onChange={(event) => {
            const next = event.target.value as Theme;
            setTheme(next);
            applyTheme(next);
          }}
        >
          <option value="dark">{t("settings.dark")}</option>
          <option value="light">{t("settings.light")}</option>
        </Select>
      </Field>
      <Field label={t("settings.language")}>
        <Select value={i18n.language} onChange={(event) => setLanguage(event.target.value as LanguageCode)}>
          {LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
        </Select>
      </Field>
    </section>
  );
}

// ---------------------------------------------------------------- account

function AccountSection() {
  const { t, i18n } = useTranslation();
  const { user, logout, reload } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  if (!user) return null;

  const run = async (action: () => Promise<unknown>, success?: string) => {
    setError(null);
    setMessage(null);
    try {
      await action();
      if (success) setMessage(success);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section className="card flex flex-col gap-5 p-6">
      <h2 className="text-lg font-semibold">{t("settings.account")}</h2>
      {message && <Alert tone="success">{message}</Alert>}
      {error && <Alert>{error}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{user.email}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            {user.emailVerified ? <CheckCircleIcon className="h-4 w-4 text-monkii-500" /> : <ExclamationTriangleIcon className="h-4 w-4 text-monkii-300" />}
            {user.emailVerified ? t("settings.emailVerified") : t("settings.emailNotVerified")}
          </p>
        </div>
        {!user.emailVerified && (
          <Button variant="secondary" size="sm" onClick={() => run(() => resendVerification(i18n.language), t("settings.resent"))}>
            {t("settings.resend")}
          </Button>
        )}
      </div>

      {user.accountType === "LISTENER" && (
        <div className="rounded-xl bg-elevated/50 p-4">
          <p className="font-semibold">{t("settings.upgradeTitle")}</p>
          <p className="mb-3 text-sm text-muted">{t("settings.upgradeBody")}</p>
          <div className="flex flex-wrap gap-2">
            {(["ARTIST", "MANAGER", "LABEL"] as const).map((type) => (
              <Button
                key={type}
                size="sm"
                variant="secondary"
                onClick={() =>
                  run(async () => {
                    await changeAccountType(type);
                    await reload();
                    navigate("/studio");
                  })
                }
              >
                {t("settings.upgrade", { type: t(`auth.types.${type}.title`) })}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => run(async () => { await logout(); navigate("/"); })}>
          {t("common.signOut")}
        </Button>
        <Button variant="ghost" onClick={() => run(async () => { await logoutEverywhere(); navigate("/login"); })}>
          {t("settings.logoutAll")}
        </Button>
      </div>

      <details className="rounded-xl border border-monkii-800/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-monkii-300">{t("settings.deleteAccount")}</summary>
        <p className="mt-2 text-sm text-muted">{t("settings.deleteBody")}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input type="password" placeholder={t("settings.confirmPassword")} value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button
            variant="danger"
            disabled={!password}
            onClick={() =>
              run(async () => {
                await deleteAccount(password);
                await logout();
                navigate("/");
              })
            }
          >
            {t("common.delete")}
          </Button>
        </div>
      </details>
    </section>
  );
}
