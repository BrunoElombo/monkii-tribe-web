import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, MicrophoneIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../auth/AuthProvider";
import { Avatar, Cover } from "../../components/Cover";
import { EarningsPanel } from "../../components/EarningsPanel";
import { ImageUpload } from "../../components/ImageUpload";
import { Alert, Badge, Button, EmptyState, Field, Input, PageLoader, Select, Textarea } from "../../components/ui";
import { useGenres, useStudioReleases } from "../../hooks/catalog";
import { useCurrentOrg, useRoster } from "../../hooks/orgs";
import { useArtistById, useMyArtist } from "../../hooks/user";
import { changeAccountType } from "../../services/auth.service";
import { createRelease } from "../../services/catalog.service";
import { createMyArtist, updateArtistProfile, updateMyArtist } from "../../services/user.service";
import type { Artist, ArtistPermission, ReleaseType } from "../../types";
import { errorMessage, isNotFound, translatedError } from "../../utils/problems";
import { ARTIST_LINKS, artistProfileSchema, type ArtistProfileValues } from "../../validation/profile.schemas";
import { ArtistContracts } from "./ArtistContracts";
import { StatsDashboard } from "./StatsDashboard";
import { StudioEvents } from "./StudioEvents";

type StudioTab = "releases" | "events" | "stats" | "contracts" | "earnings" | "profile";

/** Tabs and the contract permission a label or manager needs for each (MGT-05). */
const STUDIO_TABS: { key: StudioTab; label: string; permission: ArtistPermission | null }[] = [
  { key: "releases", label: "studio.releasesTab", permission: "MANAGE_RELEASES" },
  { key: "events", label: "studio.eventsTab", permission: "MANAGE_EVENTS" },
  { key: "stats", label: "studio.statsTab", permission: "VIEW_ANALYTICS" },
  { key: "contracts", label: "studio.contractsTab", permission: null }, // the artist only
  { key: "earnings", label: "studio.earningsTab", permission: "VIEW_EARNINGS" },
  { key: "profile", label: "studio.profileTab", permission: "MANAGE_PROFILE" },
];

/** Entry point of the artist studio. Decides what the user needs to see first. */
export function StudioPage() {
  const { t } = useTranslation();
  const { user, reload } = useAuth();
  const navigate = useNavigate();
  const artist = useMyArtist();
  const [params] = useSearchParams();
  const managedId = params.get("artist");

  if (!user) return null;

  // A label or manager working on one of its artists (MGT-09)
  if (managedId) return <ManagedStudio artistId={managedId} />;

  if (user.accountType === "MANAGER" || user.accountType === "LABEL") return <Navigate to="/org" replace />;

  if (user.accountType === "LISTENER") {
    return (
      <div className="card mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center">
        <MicrophoneIcon className="h-12 w-12 text-monkii-500" />
        <h1 className="text-2xl font-semibold">{t("studio.becomeArtistTitle")}</h1>
        <p className="text-sm text-muted">{t("studio.becomeArtistBody")}</p>
        <Button
          size="lg"
          onClick={async () => {
            await changeAccountType("ARTIST");
            await reload();
            navigate("/studio");
          }}
        >
          {t("studio.becomeArtist")}
        </Button>
      </div>
    );
  }

  if (artist.isPending) return <PageLoader />;

  const noProfile = artist.isError && isNotFound(artist.error);
  if (noProfile) return <ArtistProfileForm />;
  if (artist.isError) return <Alert>{errorMessage(artist.error)}</Alert>;

  return <StudioHome artist={artist.data} />;
}

/** The studio of an artist managed through a contract: tabs follow the contract's permissions. */
function ManagedStudio({ artistId }: { artistId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const current = useCurrentOrg();
  const roster = useRoster(current.org?.id);
  const artist = useArtistById(artistId);

  if (artist.isPending || current.isPending || (current.org && roster.isPending)) return <PageLoader />;
  if (artist.isError) return <Alert>{translatedError(artist.error)}</Alert>;

  // The owner (or an admin) opening their own link simply gets the full studio
  if (artist.data.isOwner || user?.isAdmin) return <StudioHome artist={artist.data} />;

  const contract = roster.data?.find((c) => c.artist.id === artistId);
  if (!contract) {
    return (
      <EmptyState
        icon={<MicrophoneIcon />}
        title={`${artist.data.stageName} — ${t("studio.noContract")}`}
        action={<Link to="/org" className="text-sm font-semibold text-monkii-400 hover:underline">{t("studio.backToOrg")}</Link>}
      />
    );
  }
  return <StudioHome artist={artist.data} permissions={contract.permissions} roster={roster.data?.map((c) => c.artist) ?? []} />;
}

interface StudioHomeProps {
  artist: Artist;
  /** Set when a label or manager works on the artist; undefined for the owner */
  permissions?: ArtistPermission[];
  roster?: { id: string; stageName: string }[];
}

function StudioHome({ artist, permissions, roster }: StudioHomeProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const managed = permissions !== undefined;

  const tabs = STUDIO_TABS.filter(({ permission }) => !managed || (permission !== null && permissions.includes(permission)));
  const requested = params.get("tab") as StudioTab | null;
  const tab = tabs.find((t) => t.key === requested)?.key ?? tabs[0]?.key;
  const setTab = (key: StudioTab) => {
    const next = new URLSearchParams(params);
    next.set("tab", key);
    setParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      {managed && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-monkii-500/10 px-4 py-2 text-sm">
          <Link to="/org" className="inline-flex items-center gap-1 font-semibold text-monkii-300 hover:underline">
            <ArrowLeftIcon className="h-4 w-4" />{t("studio.backToOrg")}
          </Link>
          <span className="text-muted">{t("studio.managedNotice")}</span>
          {roster && roster.length > 1 && (
            <Select className="ml-auto h-9 w-auto py-0" value={artist.id} onChange={(event) => navigate(`/studio?artist=${event.target.value}${tab ? `&tab=${tab}` : ""}`)}>
              {roster.map((a) => <option key={a.id} value={a.id}>{a.stageName}</option>)}
            </Select>
          )}
        </div>
      )}

      <header className="flex flex-wrap items-center gap-4">
        <Avatar src={artist.avatarUrl} alt={artist.stageName} className="h-16 w-16" />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">{t("studio.title")}</p>
          <h1 className="text-2xl font-semibold">{artist.stageName}</h1>
        </div>
        <Link to={`/artists/${artist.slug}`} className="text-sm font-semibold text-monkii-400 hover:underline">{t(managed ? "org.artistPage" : "studio.viewPage")}</Link>
      </header>

      {!user?.emailVerified && <Alert tone="info">{t("studio.verifyFirst")}</Alert>}
      {managed && tabs.length === 0 && <Alert tone="info">{t("studio.noPermissions")}</Alert>}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx("whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold", tab === key ? "bg-monkii-500 text-monkii-ink" : "bg-surface text-muted")}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {tab === "releases" && <ReleasesList artist={artist} />}
      {tab === "events" && <StudioEvents artist={artist} />}
      {tab === "stats" && <StatsDashboard artistId={artist.id} />}
      {tab === "contracts" && <ArtistContracts artist={artist} />}
      {tab === "earnings" && <EarningsPanel beneficiary={{ type: "ARTIST", id: artist.id }} canWithdraw={!managed} />}
      {tab === "profile" && <ArtistProfileForm artist={artist} managed={managed} />}
    </div>
  );
}

// ---------------------------------------------------------------- releases list + creation

const RELEASE_TYPES: ReleaseType[] = ["SINGLE", "EP", "ALBUM", "MIXTAPE", "COMPILATION"];

function ReleasesList({ artist }: { artist: Artist }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ReleaseType>("SINGLE");

  const releases = useStudioReleases(artist.id);

  const create = useMutation({
    mutationFn: () => createRelease({ artistId: artist.id, title: title.trim(), type }),
    onSuccess: (release) => navigate(`/studio/releases/${release.id}`),
  });

  return (
    <div className="flex flex-col gap-4">
      {creating ? (
        <form
          className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim()) create.mutate();
          }}
        >
          <Field label={t("studio.releaseTitle")} className="flex-1">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus maxLength={200} />
          </Field>
          <Field label={t("studio.releaseType")}>
            <Select value={type} onChange={(event) => setType(event.target.value as ReleaseType)}>
              {RELEASE_TYPES.map((value) => <option key={value} value={value}>{t(`release.types.${value}`)}</option>)}
            </Select>
          </Field>
          <Button type="submit" loading={create.isPending}>{t("common.create")}</Button>
          <Button type="button" variant="ghost" onClick={() => setCreating(false)}>{t("common.cancel")}</Button>
        </form>
      ) : (
        <Button className="self-start" icon={<PlusIcon className="h-5 w-5" />} onClick={() => setCreating(true)}>
          {t("studio.newRelease")}
        </Button>
      )}
      {create.isError && <Alert>{errorMessage(create.error)}</Alert>}

      {releases.isPending && <PageLoader />}
      {releases.data?.length === 0 && <EmptyState icon={<MicrophoneIcon />} title={t("studio.noReleases")} />}

      <ul className="flex flex-col gap-2">
        {releases.data?.map((release) => (
          <li key={release.id}>
            <Link to={`/studio/releases/${release.id}`} className="card flex items-center gap-4 p-3 transition hover:border-monkii-500/50">
              <Cover src={release.coverThumbUrl} alt="" className="h-14 w-14 shrink-0" rounded="rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{release.title}</p>
                <p className="text-xs text-muted">
                  {t(`release.types.${release.type}`)} · {t("common.tracks", { count: release.trackCount ?? 0 })}
                </p>
              </div>
              <Badge tone={release.status === "PUBLISHED" ? "strong" : release.status === "READY" ? "accent" : "muted"}>
                {t(`studio.status.${release.status}`)}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- artist profile (ACC-03)

type ProfileForm = ArtistProfileValues;

const LINKS = ARTIST_LINKS;

function ArtistProfileForm({ artist, managed = false }: { artist?: Artist; managed?: boolean }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const genres = useGenres();
  const [images, setImages] = useState({ avatarUrl: artist?.avatarUrl ?? null, bannerUrl: artist?.bannerUrl ?? null });
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState } = useForm<ProfileForm>({
    resolver: zodResolver(artistProfileSchema),
    defaultValues: { genres: [], country: "CM" },
  });

  useEffect(() => {
    if (!artist) return;
    reset({
      stageName: artist.stageName,
      bio: artist.bio ?? "",
      bioFr: artist.bioFr ?? "",
      genres: artist.genres,
      country: artist.country ?? "CM",
      city: artist.city ?? "",
      ...Object.fromEntries(LINKS.map((key) => [key, artist.links[key] ?? ""])),
    });
  }, [artist, reset]);

  const save = useMutation({
    mutationFn: (values: ProfileForm) => {
      const body = {
        stageName: values.stageName,
        bio: values.bio || null,
        bioFr: values.bioFr || null,
        genres: values.genres,
        country: values.country || null,
        city: values.city || null,
        avatarUrl: images.avatarUrl,
        bannerUrl: images.bannerUrl,
        links: Object.fromEntries(LINKS.filter((key) => values[key]).map((key) => [key, values[key]])),
      };
      // Labels and managers edit through the artist's id (MANAGE_PROFILE, audited)
      if (managed && artist) return updateArtistProfile(artist.id, body);
      return artist ? updateMyArtist(body) : createMyArtist(body);
    },
    onSuccess: () => {
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ["artists"] });
    },
  });

  const selectedGenres = watch("genres");
  const toggleGenre = (slug: string) => {
    const next = selectedGenres.includes(slug) ? selectedGenres.filter((g) => g !== slug) : [...selectedGenres, slug].slice(0, 5);
    setValue("genres", next, { shouldDirty: true });
  };

  return (
    <form onSubmit={handleSubmit((values) => { setSaved(false); save.mutate(values); })} className="card flex max-w-3xl flex-col gap-5 p-6" noValidate>
      {!artist && (
        <div>
          <h1 className="text-2xl font-semibold">{t("studio.createProfile")}</h1>
          <p className="text-sm text-muted">{t("studio.createProfileBody")}</p>
        </div>
      )}
      {save.isError && <Alert>{errorMessage(save.error)}</Alert>}

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <ImageUpload purpose="AVATAR" label={t("settings.changeAvatar")} onUploaded={(asset) => setImages((i) => ({ ...i, avatarUrl: asset.variants?.["300"] ?? null }))}>
          <Avatar src={images.avatarUrl} alt="" />
        </ImageUpload>
        <ImageUpload purpose="BANNER" label={t("studio.banner")} hint="1500×500" onUploaded={(asset) => setImages((i) => ({ ...i, bannerUrl: asset.variants?.["1500"] ?? null }))}>
          <div className="aspect-[3/1] bg-gradient-to-br from-monkii-700 to-monkii-950">
            {images.bannerUrl && <img src={images.bannerUrl} alt="" className="h-full w-full object-cover" />}
          </div>
        </ImageUpload>
      </div>

      <Field label={t("studio.stageName")} error={formState.errors.stageName && t("studio.stageName")}>
        <Input {...register("stageName")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("studio.bio")} optional><Textarea rows={5} {...register("bio")} /></Field>
        <Field label={t("studio.bioFr")} optional><Textarea rows={5} {...register("bioFr")} /></Field>
      </div>

      <div>
        <p className="label">{t("studio.genres")} <span className="font-normal text-muted">({t("studio.genresHint")})</span></p>
        <div className="flex flex-wrap gap-2">
          {genres.data?.map((genre) => (
            <button
              type="button"
              key={genre.slug}
              onClick={() => toggleGenre(genre.slug)}
              className={clsx("chip", selectedGenres.includes(genre.slug) && "border-monkii-500 bg-monkii-500/15 text-fg")}
            >
              {i18n.language === "fr" ? genre.nameFr : genre.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("auth.country")} optional><Input maxLength={2} {...register("country")} /></Field>
        <Field label={t("auth.city")} optional><Input {...register("city")} /></Field>
      </div>

      <div>
        <p className="label">{t("studio.links")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {LINKS.map((key) => (
            <Input key={key} placeholder={`https://… (${key})`} {...register(key)} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={save.isPending}>{artist ? t("common.save") : t("common.create")}</Button>
        {saved && <span className="text-sm text-monkii-400">{t("common.saved")}</span>}
      </div>
    </form>
  );
}
