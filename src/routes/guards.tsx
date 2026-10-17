import { ReactNode, Suspense } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import { PageLoader } from "../components/ui";
import { PlayerProvider } from "../player/PlayerProvider";

/** Providers that need the router (the player navigates to /login). */
export function Root() {
  const { initialising } = useAuth();
  if (initialising) return <PageLoader />;

  return (
    <PlayerProvider>
      <Outlet />
    </PlayerProvider>
  );
}

/** Signed-in screens: anyone else goes to /login, and comes back here afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}
