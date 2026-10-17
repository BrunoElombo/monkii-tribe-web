import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../auth/AuthProvider";
import { GoogleButton } from "../../auth/GoogleButton";
import { LocationFields } from "../../components/LocationFields";
import { BuildingOffice2Icon, BriefcaseIcon, HeadphonesIcon, MicrophoneIcon } from "../../components/icons";
import { Alert, Button, Checkbox, Field, Input, Select } from "../../components/ui";
import { errorMessage } from "../../utils/problems";
import { aboutSchema, type AboutValues, credentialsSchema, type CredentialsValues } from "../../validation/auth.schemas";
import { AuthShell } from "./AuthShell";

const ACCOUNT_TYPES = [
  { value: "LISTENER", icon: HeadphonesIcon },
  { value: "ARTIST", icon: MicrophoneIcon },
  { value: "MANAGER", icon: BriefcaseIcon },
  { value: "LABEL", icon: BuildingOffice2Icon },
] as const;

type AccountType = (typeof ACCOUNT_TYPES)[number]["value"];

type Credentials = CredentialsValues;
type About = AboutValues;

/** Three short steps: account type, credentials, demographics (ACC-02). */
export function RegisterPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const initialType = (params.get("type")?.toUpperCase() as AccountType) ?? null;

  const [step, setStep] = useState(initialType ? 2 : 1);
  const [accountType, setAccountType] = useState<AccountType>(initialType ?? "LISTENER");
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  return (
    <AuthShell
      title={t("auth.createAccount")}
      subtitle={t("auth.step", { current: step, total: 3 })}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="font-semibold text-monkii-400 hover:underline">{t("common.signIn")}</Link>
        </>
      }
    >
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">{t("auth.chooseType")}</p>
          {ACCOUNT_TYPES.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAccountType(value)}
              className={clsx(
                "flex items-center gap-4 rounded-2xl border p-4 text-left transition",
                accountType === value ? "border-monkii-500 bg-monkii-500/10" : "border-line hover:border-monkii-500/50",
              )}
            >
              <Icon className="h-7 w-7 shrink-0 text-monkii-500" />
              <span>
                <span className="block font-semibold">{t(`auth.types.${value}.title`)}</span>
                <span className="block text-xs text-muted">{t(`auth.types.${value}.body`)}</span>
              </span>
            </button>
          ))}
          <Button size="lg" className="mt-2" onClick={() => setStep(2)}>{t("common.continue")}</Button>
          {/* Google accounts start as listeners and can be upgraded in the settings */}
          <div className="mt-4"><GoogleButton /></div>
        </div>
      )}

      {step === 2 && (
        <CredentialsStep
          defaultValues={credentials}
          onBack={() => setStep(1)}
          onNext={(values) => {
            setCredentials(values);
            setStep(3);
          }}
        />
      )}

      {step === 3 && credentials && (
        <AboutStep accountType={accountType} credentials={credentials} onBack={() => setStep(2)} />
      )}
    </AuthShell>
  );
}

function CredentialsStep({ defaultValues, onBack, onNext }: { defaultValues: Credentials | null; onBack: () => void; onNext: (values: Credentials) => void }) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState } = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: defaultValues ?? undefined,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-4" noValidate>
      <Field label={t("auth.displayName")} hint={t("auth.displayNameHint")} error={formState.errors.displayName && t("auth.displayNameHint")}>
        <Input autoComplete="name" autoFocus {...register("displayName")} />
      </Field>
      <Field label={t("auth.email")} error={formState.errors.email && t("auth.email")}>
        <Input type="email" autoComplete="email" {...register("email")} />
      </Field>
      <Field label={t("auth.password")} hint={t("auth.passwordHint")} error={formState.errors.password && t("auth.passwordHint")}>
        <Input type="password" autoComplete="new-password" {...register("password")} />
      </Field>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>{t("common.back")}</Button>
        <Button type="submit">{t("common.continue")}</Button>
      </div>
    </form>
  );
}

function AboutStep({ accountType, credentials, onBack }: { accountType: AccountType; credentials: Credentials; onBack: () => void }) {
  const { t, i18n } = useTranslation();
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState } = useForm<About>({
    resolver: zodResolver(aboutSchema),
    defaultValues: { gender: "UNDISCLOSED", country: "CM", region: "" },
  });

  const onSubmit = handleSubmit(async (about) => {
    setError(null);
    try {
      await registerAccount({
        ...credentials,
        accountType,
        acceptTerms: true,
        demographics: {
          birthDate: about.birthDate,
          gender: about.gender,
          country: about.country,
          region: about.region,
          city: about.city || null,
          language: i18n.language === "fr" ? "fr" : "en",
        },
      });
      navigate("/check-email", { replace: true, state: { email: credentials.email } });
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <p className="font-semibold">{t("auth.aboutYou")}</p>
        <p className="text-xs text-muted">{t("auth.aboutYouHint")}</p>
      </div>
      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("auth.birthDate")} error={formState.errors.birthDate && t("auth.birthDate")}>
          <Input type="date" max={new Date().toISOString().slice(0, 10)} {...register("birthDate")} />
        </Field>
        <Field label={t("auth.gender")}>
          <Select {...register("gender")}>
            {(["FEMALE", "MALE", "NON_BINARY", "UNDISCLOSED"] as const).map((g) => (
              <option key={g} value={g}>{t(`auth.genders.${g}`)}</option>
            ))}
          </Select>
        </Field>
      </div>

      <LocationFields register={register} watch={watch} errors={formState.errors} />

      <Checkbox label={t("auth.acceptTerms")} {...register("acceptTerms")} />
      {formState.errors.acceptTerms && <p className="-mt-2 text-xs text-monkii-300">{t("auth.acceptTerms")}</p>}

      <div className="mt-2 grid grid-cols-2 gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>{t("common.back")}</Button>
        <Button type="submit" loading={formState.isSubmitting}>{t("common.signUp")}</Button>
      </div>
    </form>
  );
}
