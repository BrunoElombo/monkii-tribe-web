import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import { AppLayout } from "../components/AppLayout";
import { ArtistPage } from "../pages/ArtistPage";
import { ChartsPage } from "../pages/ChartsPage";
import { CheckoutResultPage } from "../pages/CheckoutResultPage";
import { ClaimPage } from "../pages/ClaimPage";
import { EventPage } from "../pages/EventPage";
import { EventsPage } from "../pages/EventsPage";
import { HomePage } from "../pages/HomePage";
import { LibraryPage } from "../pages/LibraryPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PlaylistPage } from "../pages/PlaylistPage";
import { PremiumPage } from "../pages/PremiumPage";
import { ReleasePage } from "../pages/ReleasePage";
import { SearchPage } from "../pages/SearchPage";
import { SettingsPage } from "../pages/SettingsPage";
import { TicketsPage } from "../pages/TicketsPage";
import { CheckEmailPage, ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from "../pages/auth/EmailPages";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { RequireAuth, Root } from "./guards";

// The studio is only for artists: load it on demand
const StudioPage = lazy(() => import("../pages/studio/StudioPage").then((m) => ({ default: m.StudioPage })));
const ReleaseEditorPage = lazy(() => import("../pages/studio/ReleaseEditorPage").then((m) => ({ default: m.ReleaseEditorPage })));
const EventEditorPage = lazy(() => import("../pages/studio/EventEditorPage").then((m) => ({ default: m.EventEditorPage })));
const CheckInPage = lazy(() => import("../pages/studio/CheckInPage").then((m) => ({ default: m.CheckInPage })));
const EventStatsPage = lazy(() => import("../pages/studio/EventStatsPage").then((m) => ({ default: m.EventStatsPage })));
const AdminPage = lazy(() => import("../pages/AdminPage").then((m) => ({ default: m.AdminPage })));
// Labels and managers only
const OrgPage = lazy(() => import("../pages/org/OrgPage").then((m) => ({ default: m.OrgPage })));
const OrgInvitationPage = lazy(() => import("../pages/org/OrgPage").then((m) => ({ default: m.OrgInvitationPage })));
const ContractsRedirect = lazy(() => import("../pages/org/OrgPage").then((m) => ({ default: m.ContractsRedirect })));

/** The route table: public screens, then the app shell with its signed-in screens. */
export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/check-email", element: <CheckEmailPage /> },
      { path: "/verify-email", element: <VerifyEmailPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <HomePage /> },
          { path: "/search", element: <SearchPage /> },
          { path: "/artists/:slug", element: <ArtistPage /> },
          { path: "/releases/:id", element: <ReleasePage /> },
          { path: "/playlists/:id", element: <PlaylistPage /> },
          { path: "/events", element: <EventsPage /> },
          { path: "/events/:id", element: <EventPage /> },
          { path: "/charts", element: <ChartsPage /> },
          { path: "/premium", element: <PremiumPage /> },
          { path: "/claim", element: <ClaimPage /> },
          { path: "/checkout/result", element: <RequireAuth><CheckoutResultPage /></RequireAuth> },
          { path: "/tickets", element: <RequireAuth><TicketsPage /></RequireAuth> },
          { path: "/library", element: <RequireAuth><LibraryPage /></RequireAuth> },
          { path: "/settings", element: <RequireAuth><SettingsPage /></RequireAuth> },
          { path: "/studio", element: <RequireAuth><StudioPage /></RequireAuth> },
          { path: "/studio/releases/:id", element: <RequireAuth><ReleaseEditorPage /></RequireAuth> },
          { path: "/studio/events/:id", element: <RequireAuth><EventEditorPage /></RequireAuth> },
          { path: "/studio/events/:id/check-in", element: <RequireAuth><CheckInPage /></RequireAuth> },
          { path: "/studio/events/:id/stats", element: <RequireAuth><EventStatsPage /></RequireAuth> },
          { path: "/org", element: <RequireAuth><OrgPage /></RequireAuth> },
          { path: "/org/invitations/:orgId", element: <RequireAuth><OrgInvitationPage /></RequireAuth> },
          { path: "/contracts", element: <RequireAuth><ContractsRedirect /></RequireAuth> },
          { path: "/admin", element: <RequireAuth><AdminPage /></RequireAuth> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
