import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import {
  BellIcon, BuildingLibraryIcon, BuildingOffice2Icon, CalendarDaysIcon, ChartBarIcon, Cog6ToothIcon, HomeIcon, MagnifyingGlassIcon,
  MicrophoneIcon, ShieldCheckIcon, SparklesIcon, TicketIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { useNotifications } from "../hooks/notifications";
import { useMyOrgs } from "../hooks/orgs";
import { useProfile } from "../hooks/user";
import { PlayerBar } from "../player/PlayerBar";
import { markAllNotificationsRead } from "../services/notification.service";
import { Avatar } from "./Cover";
import { Logo } from "./Logo";
import { Button, IconButton } from "./ui";

interface NavItem {
  to: string;
  key: string;
  icon: typeof HomeIcon;
  end?: boolean;
  auth?: boolean;
  admin?: boolean;
  /** Only for label and manager accounts (and people invited into their team) */
  org?: boolean;
  /** Hidden for label and manager accounts, who work through their organisation */
  artistSide?: boolean;
  /** Shown in the phone's bottom bar (5 at most) */
  mobile?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", key: "home", icon: HomeIcon, end: true, mobile: true },
  { to: "/search", key: "search", icon: MagnifyingGlassIcon, mobile: true },
  { to: "/events", key: "events", icon: CalendarDaysIcon, mobile: true },
  { to: "/charts", key: "charts", icon: ChartBarIcon },
  { to: "/library", key: "library", icon: BuildingLibraryIcon, auth: true, mobile: true },
  { to: "/tickets", key: "tickets", icon: TicketIcon, auth: true },
  { to: "/premium", key: "premium", icon: SparklesIcon },
  { to: "/studio", key: "studio", icon: MicrophoneIcon, auth: true, mobile: true, artistSide: true },
  { to: "/org", key: "org", icon: BuildingOffice2Icon, auth: true, mobile: true, org: true },
  { to: "/admin", key: "admin", icon: ShieldCheckIcon, auth: true, admin: true },
];

/** Sidebar on desktop, bottom tabs on phones, mini player docked at the bottom. */
export function AppLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const orgs = useMyOrgs();
  const isOrgAccount = user?.accountType === "LABEL" || user?.accountType === "MANAGER";
  const inOrg = isOrgAccount || Boolean(orgs.data?.length);
  const items = NAV.filter(
    (item) =>
      (!item.auth || user) &&
      (!item.admin || user?.isAdmin) &&
      (!item.org || inOrg) &&
      (!item.artistSide || !isOrgAccount),
  );
  const mobileItems = items.filter((item) => item.mobile).slice(0, 5);

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-line bg-bg px-4 py-6 md:flex">
        <Link to="/" className="px-2">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-1">
          {items.map(({ to, key, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  isActive ? "bg-surface text-fg" : "text-muted hover:text-fg",
                )
              }
            >
              <Icon className="h-5 w-5" />
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 pb-40 pt-4 md:px-8 md:pb-32">
          <Outlet />
        </main>

        <div className="fixed inset-x-0 bottom-0 z-40 md:left-60">
          <PlayerBar />
          <nav
            className="safe-bottom grid border-t border-line bg-bg md:hidden"
            style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}
          >
            {mobileItems.map(({ to, key, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", isActive ? "text-monkii-500" : "text-muted")
                }
              >
                <Icon className="h-6 w-6" />
                {t(`nav.${key}`)}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur md:px-8">
      <Link to="/" className="md:hidden">
        <Logo compact />
      </Link>
      <div className="hidden md:block" />

      {user ? (
        <div className="flex items-center gap-1">
          <NotificationBell />
          <IconButton label={t("nav.settings")} onClick={() => navigate("/settings")}>
            <Cog6ToothIcon className="h-5 w-5" />
          </IconButton>
          <ProfileChip />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/register")}>
            {t("common.signUp")}
          </Button>
          <Button size="sm" onClick={() => navigate("/login")}>
            {t("common.signIn")}
          </Button>
        </div>
      )}
    </header>
  );
}

function ProfileChip() {
  const profile = useProfile();
  return (
    <Link to="/settings" className="ml-1 flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm font-medium hover:border-monkii-500/60">
      <Avatar src={profile.data?.avatarUrl} alt="" className="h-7 w-7" />
      <span className="hidden max-w-32 truncate sm:block">{profile.data?.displayName ?? "…"}</span>
    </Link>
  );
}

/** Bell with unread badge and a dropdown list (NOT-02). */
function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notifications = useNotifications();
  const queryClient = useQueryClient();

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const unread = notifications.data?.unread ?? 0;

  return (
    <div className="relative" ref={ref}>
      <IconButton label={t("nav.notifications")} onClick={() => setOpen((o) => !o)}>
        <BellIcon className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-monkii-500 px-1 text-[10px] font-bold text-monkii-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </IconButton>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-80 rounded-2xl border border-line bg-surface p-2 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="font-display font-semibold">{t("notifications.title")}</p>
            {unread > 0 && (
              <button type="button" className="text-xs font-semibold text-monkii-400 hover:underline" onClick={() => markAll.mutate()}>
                {t("notifications.markAll")}
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.data?.items.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted">{t("notifications.empty")}</li>}
            {notifications.data?.items.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.link ?? "#"}
                  onClick={() => setOpen(false)}
                  className={clsx("block rounded-xl px-3 py-2 hover:bg-elevated", !item.readAt && "bg-monkii-500/5")}
                >
                  <p className="text-sm font-semibold">{t(`notifications.types.${item.type}.title`, { ...item.params, defaultValue: item.title })}</p>
                  <p className="text-xs text-muted">{t(`notifications.types.${item.type}.body`, { ...item.params, defaultValue: item.body })}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
