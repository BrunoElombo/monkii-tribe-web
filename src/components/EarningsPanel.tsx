import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownTrayIcon, BanknotesIcon } from "@heroicons/react/24/outline";
import { useEarnings, useRequestPayout, useSavePayoutMethod } from "../hooks/royalties";
import { Beneficiary, downloadStatement } from "../services/royalty.service";
import type { Earnings, EarningSource } from "../types";
import { formatXaf } from "../utils/format";
import { translatedError } from "../utils/problems";
import { StatTile } from "./charts";
import { Alert, Badge, Button, EmptyState, Field, Input, PageLoader, Select } from "./ui";

const SOURCES: EarningSource[] = ["STREAMS", "SALES", "TICKETS"];
/** Same rule as royalty-service: payouts go in steps of 10 FCFA. */
const PAYOUT_STEP_XAF = 10;

/**
 * Earnings of an artist or an organisation (ROY-03): balance, totals per
 * source and month, latest lines, CSV statements, payout details and requests.
 */
export function EarningsPanel({ beneficiary, canWithdraw = true }: { beneficiary: Beneficiary; canWithdraw?: boolean }) {
  const { t, i18n } = useTranslation();
  const earnings = useEarnings(beneficiary);
  const [statementError, setStatementError] = useState<string | null>(null);

  if (earnings.isPending) return <PageLoader />;
  if (earnings.isError) return <Alert>{translatedError(earnings.error)}</Alert>;

  const data = earnings.data;
  const xaf = (value: number) => formatXaf(value, i18n.language);

  const statement = async (period?: string) => {
    setStatementError(null);
    try {
      await downloadStatement(beneficiary, period);
    } catch (err) {
      setStatementError(translatedError(err));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t("earnings.available")} value={xaf(data.availableXaf)} />
        <StatTile label={t("earnings.earned")} value={xaf(data.earnedXaf)} />
        <StatTile label={t("earnings.pending")} value={xaf(data.pendingXaf)} />
        <StatTile label={t("earnings.paid")} value={xaf(data.paidXaf)} />
      </div>

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{t("earnings.bySource")}</h3>
          <Button size="sm" variant="secondary" icon={<ArrowDownTrayIcon className="h-4 w-4" />} onClick={() => statement()}>
            {t("earnings.statementAll")}
          </Button>
        </div>
        {statementError && <Alert>{statementError}</Alert>}
        <div className="grid gap-3 sm:grid-cols-3">
          {SOURCES.map((source) => (
            <div key={source} className="rounded-xl bg-elevated/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t(`earnings.sources.${source}`)}</p>
              <p className="mt-1 text-lg font-semibold">{xaf(data.totals[source] ?? 0)}</p>
            </div>
          ))}
        </div>

        {data.months.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2">{t("earnings.month")}</th>
                  {SOURCES.map((source) => <th key={source} className="py-2 text-right">{t(`earnings.sources.${source}`)}</th>)}
                  <th className="py-2 text-right">{t("earnings.total")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.months.map((month) => (
                  <tr key={month.period} className="border-t border-line">
                    <td className="py-2 font-medium">{month.period}</td>
                    {SOURCES.map((source) => <td key={source} className="py-2 text-right tabular-nums">{xaf(month[source])}</td>)}
                    <td className="py-2 text-right font-semibold tabular-nums">{xaf(month.total)}</td>
                    <td className="py-2 text-right">
                      <button type="button" className="text-xs font-semibold text-monkii-400 hover:underline" onClick={() => statement(month.period)}>CSV</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canWithdraw && <Withdraw beneficiary={beneficiary} data={data} />}

      <section className="card p-5">
        <h3 className="mb-3 font-semibold">{t("earnings.latest")}</h3>
        {data.lines.length === 0 ? (
          <EmptyState icon={<BanknotesIcon />} title={t("earnings.noLines")} />
        ) : (
          <ul className="flex flex-col">
            {data.lines.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm last:border-0">
                <div className="min-w-0">
                  <p className="truncate font-medium">{line.description}</p>
                  <p className="text-xs text-muted">
                    {t(`earnings.sources.${line.source}`)} · {line.period}{line.artist ? ` · ${line.artist}` : ""}
                  </p>
                </div>
                <span className={line.amountXaf < 0 ? "text-monkii-300" : "font-semibold"}>{xaf(line.amountXaf)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Withdraw({ beneficiary, data }: { beneficiary: Beneficiary; data: Earnings }) {
  const { t, i18n } = useTranslation();
  const saveMethod = useSavePayoutMethod(beneficiary);
  const request = useRequestPayout(beneficiary);
  const [editing, setEditing] = useState(!data.payoutMethod);
  const [method, setMethod] = useState<"MOBILE_MONEY" | "BANK">(data.payoutMethod?.method ?? "MOBILE_MONEY");
  const [account, setAccount] = useState("");
  const [holderName, setHolderName] = useState(data.payoutMethod?.holderName ?? "");
  // Mobile money only transfers multiples of 10 FCFA: offer the largest valid amount
  const withdrawableXaf = Math.floor(data.availableXaf / PAYOUT_STEP_XAF) * PAYOUT_STEP_XAF;
  const [amount, setAmount] = useState(String(withdrawableXaf));

  useEffect(() => setAmount(String(withdrawableXaf)), [withdrawableXaf]);

  const xaf = (value: number) => formatXaf(value, i18n.language);
  const belowThreshold = data.availableXaf < data.thresholdXaf;

  return (
    <section className="card grid gap-6 p-5 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold">{t("earnings.payoutMethod")}</h3>
        {!editing && data.payoutMethod ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-elevated/50 p-3 text-sm">
            <div>
              <p className="font-medium">{t(`earnings.methods.${data.payoutMethod.method}`)} · {data.payoutMethod.account}</p>
              <p className="text-xs text-muted">{data.payoutMethod.holderName}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>{t("common.edit")}</Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              saveMethod.mutate({ method, account: account.trim(), holderName: holderName.trim() }, { onSuccess: () => setEditing(false) });
            }}
          >
            <Field label={t("earnings.method")}>
              <Select value={method} onChange={(event) => setMethod(event.target.value as typeof method)}>
                <option value="MOBILE_MONEY">{t("earnings.methods.MOBILE_MONEY")}</option>
                <option value="BANK">{t("earnings.methods.BANK")}</option>
              </Select>
            </Field>
            <Field label={method === "MOBILE_MONEY" ? t("checkout.phone") : t("earnings.iban")}>
              <Input value={account} onChange={(event) => setAccount(event.target.value)} required minLength={6} />
            </Field>
            <Field label={t("earnings.holderName")}>
              <Input value={holderName} onChange={(event) => setHolderName(event.target.value)} required minLength={2} />
            </Field>
            {saveMethod.isError && <Alert>{translatedError(saveMethod.error)}</Alert>}
            <Button type="submit" className="self-start" loading={saveMethod.isPending}>{t("common.save")}</Button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-semibold">{t("earnings.withdraw")}</h3>
        <p className="text-sm text-muted">{t("earnings.threshold", { amount: xaf(data.thresholdXaf) })}</p>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            request.mutate(Number(amount));
          }}
        >
          <Field label={t("earnings.amount")} className="flex-1">
            <Input type="number" min={data.thresholdXaf} max={withdrawableXaf} step={PAYOUT_STEP_XAF} value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Button type="submit" loading={request.isPending} disabled={!data.payoutMethod || belowThreshold}>{t("earnings.request")}</Button>
        </form>
        {request.isError && <Alert>{translatedError(request.error)}</Alert>}
        {request.isSuccess && <Alert tone="success">{t("earnings.requested")}</Alert>}

        {data.payouts.length > 0 && (
          <ul className="flex flex-col text-sm">
            {data.payouts.map((payout) => (
              <li key={payout.id} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-0">
                <span>
                  {xaf(payout.amountXaf)}
                  <span className="block text-xs text-muted">{new Date(payout.createdAt).toLocaleDateString(i18n.language)} · {payout.account}</span>
                  {payout.note && <span className="block text-xs text-monkii-300">{payout.note}</span>}
                </span>
                <Badge tone={payout.status === "PAID" ? "strong" : payout.status === "REQUESTED" || payout.status === "PROCESSING" ? "accent" : "muted"}>
                  {t(`earnings.payoutStatus.${payout.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
