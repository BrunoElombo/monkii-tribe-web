import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowDownTrayIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../auth/AuthProvider";
import { useCheckout } from "../hooks/payments";
import { downloadRelease, downloadTrack } from "../services/catalog.service";
import { formatXaf } from "../utils/format";
import { translatedError } from "../utils/problems";
import { Button } from "./ui";

interface BuyButtonProps {
  type: "TRACK" | "RELEASE";
  id: string;
  priceXaf: number | null | undefined;
  isPurchased: boolean | undefined;
  size?: "sm" | "md" | "lg";
}

/**
 * "Buy · 300 FCFA" for music on sale (CAT-07), "Download MP3" once bought (MED-08).
 * Renders nothing for music that is not for sale.
 */
export function BuyButton({ type, id, priceXaf, isPurchased, size = "md" }: BuyButtonProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const checkout = useCheckout();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPurchased) {
    return (
      <Button
        variant="secondary"
        size={size}
        loading={downloading}
        icon={<ArrowDownTrayIcon className="h-5 w-5" />}
        onClick={async () => {
          setDownloading(true);
          setError(null);
          try {
            await (type === "TRACK" ? downloadTrack(id) : downloadRelease(id));
          } catch (err) {
            setError(translatedError(err));
          } finally {
            setDownloading(false);
          }
        }}
        title={error ?? undefined}
      >
        {t("commerce.download")}
      </Button>
    );
  }

  if (!priceXaf) return null;

  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        variant="secondary"
        size={size}
        loading={checkout.isPending}
        icon={<ShoppingBagIcon className="h-5 w-5" />}
        onClick={() => {
          if (!user) return navigate("/login", { state: { from: location.pathname } });
          checkout.mutate({ kind: "MUSIC", items: [{ type, id }] });
        }}
      >
        {t("commerce.buy", { price: formatXaf(priceXaf, i18n.language) })}
      </Button>
      {checkout.isError && <span role="alert" className="text-xs text-monkii-300">{translatedError(checkout.error)}</span>}
    </span>
  );
}
