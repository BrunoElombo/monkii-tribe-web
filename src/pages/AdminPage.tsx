import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckBadgeIcon, InboxIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../auth/AuthProvider";
import { Avatar, Cover } from "../components/Cover";
import { Segmented } from "../components/charts";
import { Alert, Badge, Button, EmptyState, Input, PageLoader } from "../components/ui";
import { useAdminArtists, useAdminUsers } from "../hooks/admin";
import { useReviewQueue } from "../hooks/catalog";
import { type AdminUser, toggleUserSuspension } from "../services/auth.service";
import { decideRelease } from "../services/catalog.service";
import { setArtistVerified } from "../services/user.service";
import type { Artist } from "../types";
import { errorMessage } from "../utils/problems";
import { OrdersPanel, PayoutsPanel, PlatformSettingsPanel, RoyaltyRunsPanel } from "./AdminFinance";
import { NotFoundPage } from "./NotFoundPage";

const TABS = ["review", "users", "artists", "royalties", "payouts", "orders", "settings"] as const;
type Tab = (typeof TABS)[number];

/** Administration console (CAT-11, ADM-01, ADM-03). */
export function AdminPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("review");

  if (!user?.isAdmin) return <NotFoundPage />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">{t("admin.title")}</h1>
      <div className="overflow-x-auto pb-1">
        <Segmented label={t("admin.title")} value={tab} onChange={setTab} options={TABS.map((value) => ({ value, label: t(`admin.${value}`) }))} />
      </div>
      {tab === "review" && <ReviewQueue />}
      {tab === "users" && <Users />}
      {tab === "artists" && <Artists />}
      {tab === "royalties" && <RoyaltyRunsPanel />}
      {tab === "payouts" && <PayoutsPanel />}
      {tab === "orders" && <OrdersPanel />}
      {tab === "settings" && <PlatformSettingsPanel />}
    </div>
  );
}

function useDebounced(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function ReviewQueue() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queue = useReviewQueue();

  const decide = useMutation({
    mutationFn: ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) => decideRelease(id, approve, reason),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "review"] }),
  });

  if (queue.isPending) return <PageLoader />;
  if (queue.data?.length === 0) return <EmptyState icon={<InboxIcon />} title={t("admin.emptyQueue")} />;

  return (
    <div className="flex flex-col gap-2">
      {decide.isError && <Alert>{errorMessage(decide.error)}</Alert>}
      {queue.data?.map((release) => (
        <div key={release.id} className="card flex flex-wrap items-center gap-4 p-3">
          <Cover src={release.coverThumbUrl} alt="" className="h-16 w-16 shrink-0" rounded="rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{release.title}</p>
            <p className="text-xs text-muted">{release.artist.stageName} · {t(`release.types.${release.type}`)} · {t("common.tracks", { count: release.trackCount ?? 0 })}</p>
            <Link to={`/releases/${release.id}`} className="text-xs font-semibold text-monkii-400 hover:underline">{t("admin.open")}</Link>
          </div>
          <div className="flex gap-2">
            <Button size="sm" loading={decide.isPending} onClick={() => decide.mutate({ id: release.id, approve: true })}>{t("admin.approve")}</Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const reason = window.prompt(t("admin.rejectReason"));
                if (reason && reason.trim().length >= 3) decide.mutate({ id: release.id, approve: false, reason: reason.trim() });
              }}
            >
              {t("admin.reject")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Users() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const query = useDebounced(search);
  const users = useAdminUsers(query);

  const toggle = useMutation({
    mutationFn: (user: AdminUser) => toggleUserSuspension(user),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  return (
    <div className="flex flex-col gap-3">
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("admin.search")} className="max-w-md" />
      {toggle.isError && <Alert>{errorMessage(toggle.error)}</Alert>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <tbody>
            {users.data?.items.map((user) => (
              <tr key={user.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2">
                  <span className="block font-medium">{user.email}</span>
                  <span className="text-xs text-muted">{t(`auth.types.${user.accountType}.title`)}{user.isAdmin ? " · admin" : ""} · {new Date(user.createdAt).toLocaleDateString(i18n.language)}</span>
                </td>
                <td className="px-4 py-2"><Badge tone={user.status === "ACTIVE" ? "muted" : "accent"}>{t(`admin.statuses.${user.status}`)}</Badge></td>
                <td className="px-4 py-2 text-right">
                  {!user.isAdmin && user.status !== "PENDING_DELETION" && (
                    <Button size="sm" variant={user.status === "SUSPENDED" ? "secondary" : "danger"} onClick={() => toggle.mutate(user)}>
                      {user.status === "SUSPENDED" ? t("admin.unsuspend") : t("admin.suspend")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Artists() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const query = useDebounced(search);
  const artists = useAdminArtists(query);

  const verify = useMutation({
    mutationFn: (artist: Artist) => setArtistVerified(artist.id, !artist.verified),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "artists"] });
      void queryClient.invalidateQueries({ queryKey: ["artists"] });
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("admin.search")} className="max-w-md" />
      <ul className="flex flex-col gap-2">
        {artists.data?.items.map((artist) => (
          <li key={artist.id} className="card flex items-center gap-3 p-3">
            <Avatar src={artist.avatarUrl} alt="" className="h-10 w-10" />
            <Link to={`/artists/${artist.slug}`} className="flex min-w-0 flex-1 items-center gap-1 font-semibold hover:underline">
              <span className="truncate">{artist.stageName}</span>
              {artist.verified && <CheckBadgeIcon className="h-5 w-5 shrink-0 text-monkii-500" />}
            </Link>
            <span className="text-xs text-muted">{t("common.followers", { count: artist.followerCount, formatted: artist.followerCount })}</span>
            <Button size="sm" variant="secondary" loading={verify.isPending} onClick={() => verify.mutate(artist)}>
              {artist.verified ? t("admin.unverify") : t("admin.verify")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
