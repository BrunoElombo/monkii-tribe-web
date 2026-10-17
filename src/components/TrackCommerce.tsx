import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowDownTrayIcon, CloudArrowDownIcon, ShoppingBagIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCheckout, useIsPremium } from "../hooks/payments";
import { isOfflineSupported } from "../offline/offline-store";
import { useOfflineIds, useSaveOffline } from "../offline/useOffline";
import { downloadTrack } from "../services/catalog.service";
import type { Track } from "../types";
import { formatXaf } from "../utils/format";
import { translatedError } from "../utils/problems";

const itemClass = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated";

/**
 * Commerce entries of a track's "•••" menu: buy (CAT-07), download the MP3
 * once bought (MED-08), keep it on the device with Premium (MED-07).
 */
export function TrackCommerceItems({ track, close, notify }: { track: Track; close: () => void; notify: (message: string) => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const checkout = useCheckout();
  const isPremium = useIsPremium();
  const offline = useOfflineIds();
  const { save, remove } = useSaveOffline();
  const saved = offline.has(track.id);

  const items = [];

  if (track.isPurchased) {
    items.push(
      <button
        key="download"
        type="button"
        className={itemClass}
        onClick={() => {
          close();
          downloadTrack(track.id).catch((err) => notify(translatedError(err)));
        }}
      >
        <ArrowDownTrayIcon className="h-4 w-4 text-muted" />{t("commerce.downloadMp3")}
      </button>,
    );
  } else if (track.priceXaf) {
    items.push(
      <button
        key="buy"
        type="button"
        className={itemClass}
        onClick={() => {
          close();
          checkout.mutate({ kind: "MUSIC", items: [{ type: "TRACK", id: track.id }] }, { onError: (err) => notify(translatedError(err)) });
        }}
      >
        <ShoppingBagIcon className="h-4 w-4 text-muted" />{t("commerce.buy", { price: formatXaf(track.priceXaf, i18n.language) })}
      </button>,
    );
  }

  if (isOfflineSupported() && track.audioStatus === "READY") {
    items.push(
      saved ? (
        <button key="offline" type="button" className={itemClass} onClick={() => { close(); void remove(track.id); }}>
          <XMarkIcon className="h-4 w-4 text-muted" />{t("offline.remove")}
        </button>
      ) : (
        <button
          key="offline"
          type="button"
          className={itemClass}
          onClick={() => {
            close();
            if (!isPremium) return navigate("/premium");
            notify(t("offline.saving"));
            void save([track]).then(() => notify(t("offline.saved")));
          }}
        >
          <CloudArrowDownIcon className="h-4 w-4 text-muted" />{t("offline.save")}{!isPremium && <span className="ml-auto text-[10px] font-bold text-monkii-400">PREMIUM</span>}
        </button>
      ),
    );
  }

  if (items.length === 0) return null;
  return <div className="mt-1 border-t border-line pt-1">{items}</div>;
}
