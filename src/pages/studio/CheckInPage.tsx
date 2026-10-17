import { useCallback, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, CameraIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { useQrScanner } from "../../components/qr";
import { Alert, Badge, Button, Input, PageLoader } from "../../components/ui";
import { useAttendees } from "../../hooks/events";
import { checkIn as checkInTicket, type CheckInResult } from "../../services/event.service";
import { errorMessage } from "../../utils/problems";

type Result = CheckInResult;

/** Door check-in (EVT-05): camera scan with a typed-code fallback. */
export function CheckInPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const attendees = useAttendees(id);

  const checkIn = useMutation({
    mutationFn: (value: string) => checkInTicket(id, value),
    onSuccess: (data) => {
      setResult(data);
      setCode("");
      // A short vibration tells the door staff the result without looking
      navigator.vibrate?.(data.ok ? 80 : [60, 60, 60]);
      void queryClient.invalidateQueries({ queryKey: ["events", "attendees", id] });
    },
  });

  const onScan = useCallback((value: string) => checkIn.mutate(value), [checkIn]);
  const scanner = useQrScanner(onScan);

  if (attendees.isPending) return <PageLoader />;
  if (attendees.isError) return <Alert>{errorMessage(attendees.error)}</Alert>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link to={`/studio/events/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg"><ArrowLeftIcon className="h-4 w-4" /> {t("common.back")}</Link>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-semibold">{t("checkIn.title")}</h1>
        <p className="font-display text-xl font-semibold tabular-nums">{t("checkIn.counter", { checkedIn: attendees.data.checkedIn, total: attendees.data.total })}</p>
      </div>

      {result && (
        <div
          role="status"
          className={clsx(
            "flex items-center gap-3 rounded-2xl border-2 p-4 text-lg font-semibold",
            result.ok ? "border-monkii-500 bg-monkii-500/15" : "border-monkii-800 bg-monkii-950/60",
          )}
        >
          {result.ok ? <CheckCircleIcon className="h-8 w-8 shrink-0 text-monkii-400" /> : <XCircleIcon className="h-8 w-8 shrink-0 text-monkii-300" />}
          <span>
            {result.ok
              ? t("checkIn.ok", { name: result.holderName, tier: result.tier })
              : t(`checkIn.results.${result.code}`, { defaultValue: result.code })}
            {!result.ok && result.checkedInAt && (
              <span className="block text-sm font-normal text-muted">{new Date(result.checkedInAt).toLocaleTimeString(i18n.language)}</span>
            )}
          </span>
        </div>
      )}

      <section className="card flex flex-col gap-3 p-4">
        <video ref={scanner.videoRef} className={clsx("aspect-square w-full rounded-xl bg-black object-cover", !scanner.active && "hidden")} muted playsInline />
        {scanner.error && <Alert tone="info">{t("checkIn.noCamera")}</Alert>}
        <Button variant={scanner.active ? "secondary" : "primary"} icon={<CameraIcon className="h-5 w-5" />} onClick={() => (scanner.active ? scanner.stop() : void scanner.start())}>
          {scanner.active ? t("checkIn.stopCamera") : t("checkIn.startCamera")}
        </Button>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.trim()) checkIn.mutate(code.trim());
          }}
        >
          <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={t("checkIn.typeCode")} autoCapitalize="characters" aria-label={t("checkIn.typeCode")} />
          <Button type="submit" variant="secondary" loading={checkIn.isPending}>{t("checkIn.submit")}</Button>
        </form>
        {checkIn.isError && <Alert>{errorMessage(checkIn.error)}</Alert>}
      </section>

      <section className="card p-4">
        <h2 className="mb-3 font-semibold">{t("checkIn.attendees")}</h2>
        <ul className="flex flex-col divide-y divide-line">
          {attendees.data.tickets.map((ticket) => (
            <li key={ticket.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{ticket.holderName}</span>
                <span className="block font-mono text-xs text-muted">{ticket.code} · {ticket.tier}</span>
              </span>
              <Badge tone={ticket.status === "CHECKED_IN" ? "strong" : "muted"}>{t(`tickets.statuses.${ticket.status}`)}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
