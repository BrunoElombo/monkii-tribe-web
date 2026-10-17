import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowDownTrayIcon, CheckIcon, SignalIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../auth/AuthProvider";
import { Alert, Badge, Button, Field, Input, PageLoader } from "../components/ui";
import { useCancelSubscription, useCheckout, usePricing, useSubscription } from "../hooks/payments";
import { formatXaf } from "../utils/format";
import { translatedError } from "../utils/problems";

const BENEFITS = [
  { key: "quality", icon: SignalIcon },
  { key: "offline", icon: ArrowDownTrayIcon },
  { key: "artists", icon: SparklesIcon },
] as const;

/** Premium monthly (PAY-03): one price, paid by mobile money, no automatic renewal. */
export function PremiumPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const pricing = usePricing();
  const subscription = useSubscription();
  const checkout = useCheckout();
  const cancel = useCancelSubscription();
  const [phone, setPhone] = useState("");

  if (pricing.isPending) return <PageLoader />;

  const price = subscription.data?.plan?.priceXaf ?? pricing.data?.premiumPriceXaf ?? 0;
  const active = subscription.data?.active;
  const until = subscription.data?.currentPeriodEnd ? new Date(subscription.data.currentPeriodEnd).toLocaleDateString(i18n.language, { dateStyle: "long" }) : "";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-monkii-500 via-monkii-600 to-monkii-900 p-8 text-monkii-ink">
        <p className="text-xs font-bold uppercase tracking-[0.3em]">Monkii Tribe</p>
        <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">Premium</h1>
        <p className="mt-3 max-w-lg text-sm font-medium opacity-90">{t("premium.tagline")}</p>
        <p className="mt-6 text-3xl font-bold">
          {formatXaf(price, i18n.language)}
          <span className="text-base font-semibold opacity-80"> / {t("premium.month")}</span>
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-3">
        {BENEFITS.map(({ key, icon: Icon }) => (
          <li key={key} className="card flex flex-col gap-2 p-4">
            <Icon className="h-6 w-6 text-monkii-500" />
            <p className="font-semibold">{t(`premium.benefits.${key}.title`)}</p>
            <p className="text-sm text-muted">{t(`premium.benefits.${key}.body`)}</p>
          </li>
        ))}
      </ul>

      <section className="card flex flex-col gap-4 p-6">
        {active ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="strong">{t("premium.active")}</Badge>
              <p className="text-sm">
                {subscription.data?.cancelAtPeriodEnd ? t("premium.endsOn", { date: until }) : t("premium.paidUntil", { date: until })}
              </p>
            </div>
            <p className="text-sm text-muted">{t("premium.noAutoRenew")}</p>
            <div className="flex flex-wrap gap-2">
              <Button loading={checkout.isPending} onClick={() => checkout.mutate({ kind: "SUBSCRIPTION", phone: phone || null })}>
                {t("premium.extend")}
              </Button>
              <Link to="/library?tab=offline" className="inline-flex h-10 items-center rounded-full border border-line px-4 text-sm font-semibold hover:border-monkii-500/60">
                {t("premium.myDownloads")}
              </Link>
              {!subscription.data?.cancelAtPeriodEnd && (
                <Button variant="ghost" loading={cancel.isPending} onClick={() => window.confirm(t("premium.cancelConfirm")) && cancel.mutate()}>
                  {t("premium.cancel")}
                </Button>
              )}
            </div>
          </>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!user) return navigate("/login", { state: { from: "/premium" } });
              checkout.mutate({ kind: "SUBSCRIPTION", phone: phone || null });
            }}
          >
            <h2 className="text-lg font-semibold">{t("premium.subscribe")}</h2>
            {user && !user.emailVerified && <Alert tone="info">{t("premium.verifyFirst")}</Alert>}
            <Field label={t("checkout.phone")} hint={t("checkout.phoneHint")} optional>
              <Input type="tel" inputMode="tel" placeholder="+237 6XX XX XX XX" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Field>
            <ul className="flex flex-col gap-1 text-sm text-muted">
              {(["noCommitment", "mobileMoney", "vatIncluded"] as const).map((key) => (
                <li key={key} className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-monkii-500" />{t(`premium.${key}`)}</li>
              ))}
            </ul>
            {checkout.isError && <Alert>{translatedError(checkout.error)}</Alert>}
            <Button type="submit" size="lg" className="self-start" loading={checkout.isPending} disabled={Boolean(user && !user.emailVerified)}>
              {t("premium.payWith", { amount: formatXaf(price, i18n.language) })}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
