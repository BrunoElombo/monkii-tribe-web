import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TicketIcon } from "@heroicons/react/24/outline";
import { EventCard } from "../components/EventCard";
import { Segmented } from "../components/charts";
import { EmptyState, Input, PageLoader, Select } from "../components/ui";
import { useEvents } from "../hooks/events";
import { useCountries } from "../hooks/user";

export function EventsPage() {
  const { t, i18n } = useTranslation();
  const countries = useCountries();
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const [country, setCountry] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [city, setCity] = useState("");

  // Debounce the city box
  useEffect(() => {
    const timer = setTimeout(() => setCity(cityInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [cityInput]);

  const events = useEvents({ when, country, city });
  const language = i18n.language === "fr" ? "fr" : "en";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">{t("events.title")}</h1>

      {/* All filters in one row above the results */}
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label={t("events.title")}
          value={when}
          onChange={setWhen}
          options={[
            { value: "upcoming", label: t("events.upcoming") },
            { value: "past", label: t("events.past") },
          ]}
        />
        <Select className="w-full sm:w-48" value={country} onChange={(event) => setCountry(event.target.value)} aria-label={t("auth.country")}>
          <option value="">{t("events.allCountries")}</option>
          {countries.data?.countries.map((c) => <option key={c.code} value={c.code}>{c.name[language]}</option>)}
        </Select>
        <Input className="w-full sm:w-48" value={cityInput} onChange={(event) => setCityInput(event.target.value)} placeholder={t("events.cityPlaceholder")} aria-label={t("auth.city")} />
      </div>

      {events.isPending && <PageLoader />}
      {events.data?.items.length === 0 && <EmptyState icon={<TicketIcon />} title={t("events.none")} />}

      <div className="grid gap-3 lg:grid-cols-2">
        {events.data?.items.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
    </div>
  );
}
