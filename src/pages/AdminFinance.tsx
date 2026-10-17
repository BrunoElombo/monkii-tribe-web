import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BanknotesIcon, CalculatorIcon } from "@heroicons/react/24/outline";
import { Segmented } from "../components/charts";
import { Alert, Badge, Button, EmptyState, Field, Input, PageLoader } from "../components/ui";
import { useAdminOrders, useAdminPayouts, useLedger, usePlatformSettings, useRoyaltyRun, useRoyaltyRuns } from "../hooks/admin";
import { updatePlatformSettings } from "../services/payment.service";
import { approveRoyaltyRun, computeRoyaltyRun, decidePayout } from "../services/royalty.service";
import type { AdminPayout } from "../types";
import { formatNumber, formatXaf } from "../utils/format";
import { translatedError } from "../utils/problems";

/**
 * Money side of the administration (ADM-03): platform settings, monthly
 * stream royalty runs, payout approvals and the latest orders.
 */

// ---------------------------------------------------------------- settings

const PERCENT_FIELDS = ["vatRate", "paymentFeeRate", "streamPoolShare", "salesShare", "ticketShare"] as const;
const XAF_FIELDS = ["premiumPriceXaf", "payoutThresholdXaf", "suggestedTrackPriceXaf", "suggestedReleasePriceXaf"] as const;

export function PlatformSettingsPanel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const settings = usePlatformSettings();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    const data = settings.data;
    setValues({
      ...Object.fromEntries(PERCENT_FIELDS.map((key) => [key, String(Math.round(data[key] * 10000) / 100)])),
      ...Object.fromEntries(XAF_FIELDS.map((key) => [key, String(data[key])])),
    });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      updatePlatformSettings({
        ...Object.fromEntries(PERCENT_FIELDS.map((key) => [key, Number(values[key]) / 100])),
        ...Object.fromEntries(XAF_FIELDS.map((key) => [key, Math.round(Number(values[key]))])),
      }),
    onSuccess: () => {
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      void queryClient.invalidateQueries({ queryKey: ["pricing"] });
    },
  });

  if (settings.isPending) return <PageLoader />;

  return (
    <form
      className="card flex max-w-3xl flex-col gap-5 p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(false);
        save.mutate();
      }}
    >
      <p className="text-sm text-muted">{t("adminFinance.settingsBody")}</p>
      {save.isError && <Alert>{translatedError(save.error)}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        {XAF_FIELDS.map((key) => (
          <Field key={key} label={`${t(`adminFinance.fields.${key}`)} (FCFA)`}>
            <Input type="number" min={0} step={1} value={values[key] ?? ""} onChange={(event) => setValues((v) => ({ ...v, [key]: event.target.value }))} />
          </Field>
        ))}
        {PERCENT_FIELDS.map((key) => (
          <Field key={key} label={`${t(`adminFinance.fields.${key}`)} (%)`}>
            <Input type="number" min={0} max={100} step={0.01} value={values[key] ?? ""} onChange={(event) => setValues((v) => ({ ...v, [key]: event.target.value }))} />
          </Field>
        ))}
      </div>
      <p className="text-xs text-muted">{t("adminFinance.premiumNote")}</p>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={save.isPending}>{t("common.save")}</Button>
        {saved && <span className="text-sm text-monkii-400">{t("common.saved")}</span>}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- royalty runs (ROY-01, ROY-02)

function previousMonth(): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return date.toISOString().slice(0, 7);
}

export function RoyaltyRunsPanel() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(previousMonth());
  const [openId, setOpenId] = useState<string | null>(null);

  const runs = useRoyaltyRuns();
  const detail = useRoyaltyRun(openId);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admin", "runs"] });
  const preview = useMutation({
    mutationFn: () => computeRoyaltyRun(period),
    onSuccess: (run) => {
      setOpenId(run.id);
      refresh();
    },
  });
  const approve = useMutation({ mutationFn: (id: string) => approveRoyaltyRun(id), onSuccess: refresh });

  const xaf = (value: number) => formatXaf(value, i18n.language);

  return (
    <div className="flex flex-col gap-4">
      <form
        className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          preview.mutate();
        }}
      >
        <Field label={t("adminFinance.period")} hint={t("adminFinance.periodHint")}>
          <Input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} required />
        </Field>
        <Button type="submit" icon={<CalculatorIcon className="h-5 w-5" />} loading={preview.isPending}>{t("adminFinance.compute")}</Button>
      </form>
      {(preview.isError || approve.isError) && <Alert>{translatedError(preview.error ?? approve.error)}</Alert>}

      {runs.data?.length === 0 && <EmptyState icon={<CalculatorIcon />} title={t("adminFinance.noRuns")} />}
      <ul className="flex flex-col gap-2">
        {runs.data?.map((run) => (
          <li key={run.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="flex-1 text-left" onClick={() => setOpenId(openId === run.id ? null : run.id)}>
                <p className="font-semibold">{run.period}</p>
                <p className="text-xs text-muted">
                  {t("adminFinance.runLine", { net: xaf(run.netRevenueXaf), pool: xaf(run.poolXaf), plays: formatNumber(run.totalPlays, i18n.language) })}
                </p>
              </button>
              <Badge tone={run.status === "APPROVED" ? "strong" : "accent"}>{t(`adminFinance.runStatus.${run.status}`)}</Badge>
              {run.status === "DRAFT" && (
                <Button size="sm" loading={approve.isPending} onClick={() => window.confirm(t("adminFinance.approveConfirm", { period: run.period })) && approve.mutate(run.id)}>
                  {t("admin.approve")}
                </Button>
              )}
            </div>

            {openId === run.id && detail.data?.lines && (
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted">
                  <tr><th className="py-1">{t("org.artist")}</th><th className="py-1 text-right">{t("adminFinance.premiumPlays")}</th><th className="py-1 text-right">{t("earnings.total")}</th></tr>
                </thead>
                <tbody>
                  {detail.data.lines.map((line) => (
                    <tr key={line.artistId} className="border-t border-line">
                      <td className="py-1">{line.artist}</td>
                      <td className="py-1 text-right tabular-nums">{formatNumber(line.plays, i18n.language)}</td>
                      <td className="py-1 text-right font-semibold tabular-nums">{xaf(line.amountXaf)}</td>
                    </tr>
                  ))}
                  {detail.data.lines.length === 0 && <tr><td colSpan={3} className="py-2 text-muted">{t("adminFinance.noPlays")}</td></tr>}
                </tbody>
              </table>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- payouts (ROY-04)

type PayoutStatus = AdminPayout["status"];

export function PayoutsPanel() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PayoutStatus>("REQUESTED");
  const payouts = useAdminPayouts(status);

  const decide = useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) => decidePayout(id, approve, note),
    onSuccess: (payout) => {
      // The operator has not confirmed the transfer yet: show it where "Check again" lives
      if (payout.status === "PROCESSING") setStatus("PROCESSING");
      void queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
    },
  });
  const transferProcessing = decide.isSuccess && decide.data.status === "PROCESSING";

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label={t("adminFinance.payouts")}
        value={status}
        onChange={(value) => {
          setStatus(value);
          decide.reset(); // an old message would not match the new tab
        }}
        options={(["REQUESTED", "PROCESSING", "PAID", "REJECTED", "FAILED"] as const).map((value) => ({ value, label: t(`earnings.payoutStatus.${value}`) }))}
      />
      {decide.isError && <Alert>{translatedError(decide.error)}</Alert>}
      {transferProcessing && <Alert tone="info">{t("adminFinance.transferProcessing")}</Alert>}
      {payouts.isPending && <PageLoader />}
      {payouts.data?.length === 0 && <EmptyState icon={<BanknotesIcon />} title={t("adminFinance.noPayouts")} />}
      <ul className="flex flex-col gap-2">
        {payouts.data?.map((payout) => (
          <li key={payout.id} className="card flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{payout.beneficiaryName} <Badge>{t(`adminFinance.beneficiary.${payout.beneficiaryType}`)}</Badge></p>
              <p className="text-xs text-muted">
                {t(`earnings.methods.${payout.method}`)} · {payout.account} · {payout.holderName} · {new Date(payout.createdAt).toLocaleDateString(i18n.language)}
              </p>
            </div>
            <span className="text-lg font-semibold">{formatXaf(payout.amountXaf, i18n.language)}</span>
            {payout.status === "PROCESSING" && (
              // Approving again only checks the same transfer: nothing is sent twice
              <div className="flex items-center gap-2">
                <Badge tone="accent">{t("adminFinance.processingHint")}</Badge>
                <Button size="sm" variant="secondary" loading={decide.isPending && decide.variables.id === payout.id} onClick={() => decide.mutate({ id: payout.id, approve: true })}>
                  {t("adminFinance.checkAgain")}
                </Button>
              </div>
            )}
            {payout.status === "REQUESTED" && (
              <div className="flex gap-2">
                <Button size="sm" loading={decide.isPending && decide.variables.id === payout.id} onClick={() => decide.mutate({ id: payout.id, approve: true })}>{t("adminFinance.pay")}</Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const note = window.prompt(t("adminFinance.rejectNote"));
                    if (note && note.trim().length >= 3) decide.mutate({ id: payout.id, approve: false, note: note.trim() });
                  }}
                >
                  {t("admin.reject")}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- orders and ledger

/**
 * The API gives debit minus credit. Cash and expenses are debit accounts, the
 * others (VAT, revenue, money owed to rights holders) are credit accounts:
 * shown with their natural sign, every normal balance reads as a positive amount.
 */
function naturalBalance(account: string, debitMinusCredit: number) {
  return account.startsWith("cash:") || account.startsWith("expense:") ? debitMinusCredit : -debitMinusCredit;
}

export function OrdersPanel() {
  const { t, i18n } = useTranslation();
  const orders = useAdminOrders();
  const ledger = useLedger();

  return (
    <div className="flex flex-col gap-6">
      {ledger.data && ledger.data.length > 0 && (
        <section className="card p-5">
          <h3 className="mb-3 font-semibold">{t("adminFinance.ledger")}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ledger.data.map((row) => (
              <div key={row.account} className="rounded-xl bg-elevated/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{/* ":" is i18next's namespace separator, hence the replace */}
                  {t(`adminFinance.accounts.${row.account.replace(":", "_")}`, { defaultValue: row.account })}</p>
                <p className="mt-1 font-semibold tabular-nums">{formatXaf(naturalBalance(row.account, row.balanceXaf), i18n.language)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {orders.isPending && <PageLoader />}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <tbody>
            {orders.data?.map((order) => (
              <tr key={order.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2 text-muted">{new Date(order.createdAt).toLocaleString(i18n.language, { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-4 py-2">{t(`adminFinance.kinds.${order.kind}`)}<span className="block text-xs text-muted">{order.email}</span></td>
                <td className="max-w-xs truncate px-4 py-2">{order.items.map((item) => item.title).join(", ")}</td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatXaf(order.totalXaf, i18n.language)}</td>
                <td className="px-4 py-2"><Badge tone={order.status === "PAID" ? "strong" : "muted"}>{t(`checkout.status.${order.status}`)}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
