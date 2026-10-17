import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownTrayIcon, BellAlertIcon } from "@heroicons/react/24/outline";
import { Alert, Badge, Button, Checkbox, Field, Input } from "../components/ui";
import { usePushPreferences } from "../hooks/notifications";
import { useMyOrders, useSubscription } from "../hooks/payments";
import {
  currentPushSubscription, disablePush, enablePush, isPushSupported, updatePushPreferences,
} from "../services/notification.service";
import { exportMyData, updateMyProfile } from "../services/user.service";
import type { Profile } from "../types";
import { saveBlob } from "../utils/download";
import { formatXaf } from "../utils/format";
import { translatedError } from "../utils/problems";

// ---------------------------------------------------------------- complete profile (Google sign-up)

/**
 * Google does not give us a birth date, gender or region (ACC-02). Until they
 * are filled in, statistics and age rules cannot use this account.
 */
export function CompleteProfileSection({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [birthDate, setBirthDate] = useState("");

  const save = useMutation({
    mutationFn: () => updateMyProfile({ birthDate }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  if (profile.birthDate) return null;

  return (
    <section className="card flex flex-col gap-4 border-monkii-500/60 p-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.completeTitle")}</h2>
        <p className="text-sm text-muted">{t("settings.completeBody")}</p>
      </div>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <Field label={t("auth.birthDate")} className="flex-1">
          <Input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} required max={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Button type="submit" loading={save.isPending}>{t("common.save")}</Button>
      </form>
      {save.isError && <Alert>{translatedError(save.error)}</Alert>}
      <p className="text-xs text-muted">{t("settings.completeHint")}</p>
    </section>
  );
}

// ---------------------------------------------------------------- Premium and purchases (PAY-03, PAY-06)

export function SubscriptionSection() {
  const { t, i18n } = useTranslation();
  const subscription = useSubscription();
  const orders = useMyOrders();
  const [showAll, setShowAll] = useState(false);

  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(i18n.language, { dateStyle: "medium" }) : "");
  const list = showAll ? orders.data : orders.data?.slice(0, 5);

  return (
    <section className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("settings.subscription")}</h2>
          <p className="text-sm text-muted">
            {subscription.data?.active ? t("premium.paidUntil", { date: date(subscription.data.currentPeriodEnd) }) : t("settings.freePlan")}
          </p>
        </div>
        <Link to="/premium" className="inline-flex h-10 items-center rounded-full bg-monkii-500 px-4 text-sm font-semibold text-monkii-ink">
          {subscription.data?.active ? t("premium.manage") : t("premium.discover")}
        </Link>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">{t("settings.orders")}</h3>
        {orders.data?.length === 0 && <p className="text-sm text-muted">{t("settings.noOrders")}</p>}
        <ul className="flex flex-col">
          {list?.map((order) => (
            <li key={order.id} className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm last:border-0">
              <span className="min-w-0">
                <span className="block truncate font-medium">{order.items.map((item) => item.title).join(", ")}</span>
                <span className="text-xs text-muted">{date(order.paidAt ?? order.createdAt)} · #{order.id.slice(0, 8).toUpperCase()}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="whitespace-nowrap font-semibold">{formatXaf(order.totalXaf, i18n.language)}</span>
                <Badge tone={order.status === "PAID" ? "strong" : order.status === "PENDING" ? "accent" : "muted"}>{t(`checkout.status.${order.status}`)}</Badge>
              </span>
            </li>
          ))}
        </ul>
        {(orders.data?.length ?? 0) > 5 && !showAll && (
          <button type="button" className="mt-2 text-xs font-semibold text-monkii-400 hover:underline" onClick={() => setShowAll(true)}>{t("common.seeAll")}</button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- web push (NOT-03)

const CATEGORIES = ["releases", "events", "tickets", "payments", "contracts", "payouts"] as const;
type Category = (typeof CATEGORIES)[number];

export function PushSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [enabledHere, setEnabledHere] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preferences = usePushPreferences();

  const update = useMutation({
    mutationFn: (changes: Partial<Record<Category, boolean>>) => updatePushPreferences(changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["push"] }),
  });

  useEffect(() => {
    void currentPushSubscription().then((sub) => setEnabledHere(Boolean(sub))).catch(() => setEnabledHere(false));
  }, []);

  const toggleDevice = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (enabledHere) {
        await disablePush();
        setEnabledHere(false);
      } else {
        const result = await enablePush();
        setEnabledHere(result === "enabled");
        if (result !== "enabled") setMessage(t(`push.${result}`));
      }
      void queryClient.invalidateQueries({ queryKey: ["push"] });
    } catch (err) {
      setMessage(translatedError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><BellAlertIcon className="h-5 w-5 text-monkii-500" />{t("push.title")}</h2>
          <p className="text-sm text-muted">{t("push.body", { count: preferences.data?.devices ?? 0 })}</p>
        </div>
        {isPushSupported() ? (
          <Button variant={enabledHere ? "secondary" : "primary"} loading={busy || enabledHere === null} onClick={toggleDevice}>
            {enabledHere ? t("push.disableHere") : t("push.enableHere")}
          </Button>
        ) : (
          <Badge>{t("push.unsupported")}</Badge>
        )}
      </div>
      {message && <Alert tone="info">{message}</Alert>}

      {preferences.data && (
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="label">{t("push.categories")}</legend>
          {CATEGORIES.map((category) => (
            <Checkbox
              key={category}
              checked={preferences.data[category]}
              onChange={(event) => update.mutate({ [category]: event.target.checked })}
              label={t(`push.category.${category}`)}
            />
          ))}
        </fieldset>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- data export (ACC-06)

export function ExportSection() {
  const { t } = useTranslation();
  const exportData = useMutation({
    mutationFn: exportMyData,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      saveBlob(blob, `monkii-tribe-data-${new Date().toISOString().slice(0, 10)}.json`);
    },
  });

  return (
    <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
      <div className="max-w-md">
        <h2 className="text-lg font-semibold">{t("settings.exportTitle")}</h2>
        <p className="text-sm text-muted">{t("settings.exportBody")}</p>
      </div>
      <Button variant="secondary" icon={<ArrowDownTrayIcon className="h-5 w-5" />} loading={exportData.isPending} onClick={() => exportData.mutate()}>
        {t("settings.exportButton")}
      </Button>
      {exportData.isError && <Alert>{translatedError(exportData.error)}</Alert>}
    </section>
  );
}
