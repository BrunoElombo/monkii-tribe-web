import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { DevicePhoneMobileIcon, MicrophoneIcon, TicketIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../auth/AuthProvider";
import { CardGrid, ReleaseCard } from "../components/Cards";
import { EventCard } from "../components/EventCard";
import { TrackList } from "../components/TrackList";
import { Alert, Button, EmptyState, PageLoader, SectionHeader } from "../components/ui";
import { useHome } from "../hooks/catalog";
import { useEvents } from "../hooks/events";
import { useProfile } from "../hooks/user";
import { errorMessage } from "../utils/problems";

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const profile = useProfile();
  const home = useHome();
  const events = useEvents({});

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("home.morning") : hour < 18 ? t("home.afternoon") : t("home.evening");

  return (
    <div className="flex flex-col gap-10">
      {user ? (
        <h1 className="text-3xl font-semibold md:text-4xl">
          {greeting}
          {profile.data && <span className="text-monkii-500">, {profile.data.displayName.split(" ")[0]}</span>}
        </h1>
      ) : (
        <Hero />
      )}

      {home.isPending && <PageLoader />}
      {home.isError && <Alert>{errorMessage(home.error)}</Alert>}

      {home.data && (
        <>
          {home.data.newReleases.length === 0 && <EmptyState icon={<MicrophoneIcon />} title={t("home.empty")} />}

          {home.data.newReleases.length > 0 && (
            <section>
              <SectionHeader title={t("home.newReleases")} />
              <CardGrid>
                {home.data.newReleases.map((release) => <ReleaseCard key={release.id} release={release} />)}
              </CardGrid>
            </section>
          )}

          {events.data && events.data.items.length > 0 && (
            <section>
              <SectionHeader title={t("events.upcoming")} action={<Link to="/events" className="text-sm font-semibold text-monkii-400 hover:underline">{t("common.seeAll")}</Link>} />
              <div className="grid gap-3 lg:grid-cols-2">{events.data.items.slice(0, 4).map((event) => <EventCard key={event.id} event={event} />)}</div>
            </section>
          )}

          {home.data.popularTracks.length > 0 && (
            <section>
              <SectionHeader title={t("home.popularTracks")} action={<Link to="/charts" className="text-sm font-semibold text-monkii-400 hover:underline">{t("charts.title")}</Link>} />
              <TrackList tracks={home.data.popularTracks} showPlays />
            </section>
          )}

          <section>
            <SectionHeader title={t("home.genres")} />
            <div className="flex flex-wrap gap-2">
              {home.data.genres.map((genre) => (
                <Link key={genre.slug} to={`/search?q=${encodeURIComponent(genre.name)}`} className="chip hover:border-monkii-500 hover:text-fg">
                  {i18n.language === "fr" ? genre.nameFr : genre.name}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** Shown to visitors who are not signed in. */
function Hero() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = [
    { icon: DevicePhoneMobileIcon, title: t("landing.feature1Title"), body: t("landing.feature1Body") },
    { icon: MicrophoneIcon, title: t("landing.feature2Title"), body: t("landing.feature2Body") },
    { icon: TicketIcon, title: t("landing.feature3Title"), body: t("landing.feature3Body") },
  ];

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-monkii-600 via-monkii-800 to-monkii-950 p-6 text-monkii-50 md:p-12">
      <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-6xl">{t("landing.title")}</h1>
      <p className="mt-4 max-w-xl text-monkii-100/90 md:text-lg">{t("landing.subtitle")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" className="bg-monkii-50 text-monkii-900 hover:bg-white" onClick={() => navigate("/register")}>
          {t("landing.cta")}
        </Button>
        <Button size="lg" variant="ghost" className="text-monkii-50 hover:bg-white/10 hover:text-white" onClick={() => navigate("/register?type=artist")}>
          {t("landing.artistCta")}
        </Button>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl bg-black/15 p-4">
            <Icon className="h-6 w-6 text-monkii-200" />
            <p className="mt-2 font-semibold">{title}</p>
            <p className="text-sm text-monkii-100/80">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
