import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { Alert, Button, PageLoader, Spinner } from "../components/ui";
import { useOrder } from "../hooks/payments";
import { extendOffline } from "../offline/offline-store";
import { getSubscription } from "../services/payment.service";
import type { Order } from "../types";
import { formatXaf } from "../utils/format";
import { errorMessage, isNotFound } from "../utils/problems";

/** Where the provider sends the buyer back. Waits for the signed callback (PAY-05). */
export function CheckoutResultPage() {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const orderId = params.get("order") ?? "";
  const order = useOrder(orderId, true);
  const queryClient = useQueryClient();
  const status = order.data?.status;

  // Once paid, everything that depends on purchases or Premium is stale
  useEffect(() => {
    if (status !== "PAID") return;
    for (const key of ["subscription", "tracks", "events", "orders"]) void queryClient.invalidateQueries({ queryKey: [key] });
    // A renewal keeps the saved downloads playable until the new end date
    if (order.data?.kind === "SUBSCRIPTION") {
      getSubscription()
        .then((sub) => (sub.currentPeriodEnd ? extendOffline(sub.currentPeriodEnd) : undefined))
        .catch(() => undefined);
    }
  }, [status, order.data?.kind, queryClient]);

  if (!orderId) return <Alert>{t("checkout.missingOrder")}</Alert>;
  if (order.isPending) return <PageLoader />;
  if (order.isError) {
    const missing = isNotFound(order.error);
    return <Alert>{missing ? t("checkout.unknownOrder") : errorMessage(order.error)}</Alert>;
  }

  const data = order.data;

  return (
    <div className="card mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center">
      {data.status === "PENDING" && (
        <>
          <Spinner className="h-12 w-12 text-monkii-500" />
          <h1 className="text-2xl font-semibold">{t("checkout.waiting")}</h1>
          <p className="text-sm text-muted">{t("checkout.waitingBody")}</p>
        </>
      )}
      {data.status === "PAID" && (
        <>
          <CheckCircleIcon className="h-14 w-14 text-monkii-500" />
          <h1 className="text-2xl font-semibold">{t("checkout.paid")}</h1>
          <p className="text-sm text-muted">{t("checkout.paidBody", { amount: formatXaf(data.totalXaf, i18n.language) })}</p>
          <ul className="w-full text-left text-sm">
            {data.items.map((item) => (
              <li key={item.refId} className="flex justify-between gap-3 border-b border-line py-2 last:border-0">
                <span className="truncate">{item.quantity > 1 ? `${item.quantity} × ` : ""}{item.title}</span>
                <span className="whitespace-nowrap font-semibold">{formatXaf(item.unitPriceXaf * item.quantity, i18n.language)}</span>
              </li>
            ))}
          </ul>
          <Link to={nextStep(data)}><Button>{t(`checkout.next.${data.kind}`)}</Button></Link>
        </>
      )}
      {(data.status === "FAILED" || data.status === "EXPIRED") && (
        <>
          {data.status === "FAILED" ? <XCircleIcon className="h-14 w-14 text-monkii-300" /> : <ClockIcon className="h-14 w-14 text-monkii-300" />}
          <h1 className="text-2xl font-semibold">{t(`checkout.${data.status === "FAILED" ? "failed" : "expired"}`)}</h1>
          <p className="text-sm text-muted">{data.failureReason ?? ""} {t("checkout.notCharged")}</p>
          <Link to={backTo(data)}><Button variant="secondary">{t("common.retry")}</Button></Link>
        </>
      )}
      {data.status === "REFUNDED" && <Alert tone="info">{t("checkout.refunded")}</Alert>}
    </div>
  );
}

function nextStep(order: Order) {
  if (order.kind === "SUBSCRIPTION") return "/premium";
  if (order.kind === "TICKETS") return "/tickets";
  return "/library?tab=purchases";
}

function backTo(order: Order) {
  if (order.kind === "SUBSCRIPTION") return "/premium";
  const eventId = order.items[0]?.metadata?.eventId;
  if (order.kind === "TICKETS" && eventId) return `/events/${eventId}`;
  return "/";
}
