import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ClipboardDocumentIcon, DocumentTextIcon, PlusIcon, UserGroupIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { Avatar } from "../../components/Cover";
import { Alert, Badge, Button, Checkbox, EmptyState, Field, Input, PageLoader, Select, Textarea } from "../../components/ui";
import { useAudit, useImprints, useOrgContracts, useOrgMembers, useOrgMutation, useRoster } from "../../hooks/orgs";
import { useArtistPicker } from "../../hooks/user";
import {
  addImprint, type ContractProposal, createUnclaimedArtist, inviteMember, proposeContract, removeImprint, removeMember, respondToContract,
} from "../../services/org.service";
import { ARTIST_PERMISSIONS, type ArtistPermission, type ArtistSummary, type Contract, type Organisation } from "../../types";
import { translatedError } from "../../utils/problems";

interface SectionProps {
  org: Organisation;
  isManager: boolean;
}

// ---------------------------------------------------------------- roster (MGT-09)

export function RosterSection({ org, isManager }: SectionProps) {
  const { t } = useTranslation();
  const roster = useRoster(org.id);

  if (roster.isPending) return <PageLoader />;
  if (roster.isError) return <Alert>{translatedError(roster.error)}</Alert>;

  return (
    <div className="flex flex-col gap-4">
      {roster.data.length === 0 ? (
        <EmptyState icon={<UserGroupIcon />} title={t("org.emptyRoster")} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {roster.data.map((contract) => (
            <li key={contract.id} className="card flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <Avatar src={contract.artist.avatarUrl} alt="" className="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{contract.artist.stageName}</p>
                  <p className="text-xs text-muted">
                    {t("org.share", { percent: contract.splitPercent })}
                    {!contract.artist.claimed && ` · ${t("org.unclaimed")}`}
                  </p>
                </div>
              </div>
              <PermissionChips permissions={contract.permissions} />
              <div className="flex flex-wrap gap-2">
                {contract.permissions.some((p) => p !== "VIEW_EARNINGS") && (
                  <Link to={`/studio?artist=${contract.artist.id}`} className="inline-flex h-8 items-center rounded-full bg-monkii-500 px-3 text-xs font-semibold text-monkii-ink">
                    {t("org.openStudio")}
                  </Link>
                )}
                {contract.permissions.includes("VIEW_ANALYTICS") && (
                  <Link to={`/studio?artist=${contract.artist.id}&tab=stats`} className="inline-flex h-8 items-center rounded-full border border-line px-3 text-xs font-semibold">
                    {t("studio.statsTab")}
                  </Link>
                )}
                {contract.permissions.includes("VIEW_EARNINGS") && (
                  <Link to={`/studio?artist=${contract.artist.id}&tab=earnings`} className="inline-flex h-8 items-center rounded-full border border-line px-3 text-xs font-semibold">
                    {t("studio.earningsTab")}
                  </Link>
                )}
                {contract.artist.slug && (
                  <Link to={`/artists/${contract.artist.slug}`} className="inline-flex h-8 items-center px-2 text-xs font-semibold text-monkii-400 hover:underline">
                    {t("org.artistPage")}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isManager && org.type === "LABEL" && <UnclaimedArtistForm org={org} />}
    </div>
  );
}

/** MGT-07: a label signs an artist who is not on Monkii Tribe yet. */
function UnclaimedArtistForm({ org }: { org: Organisation }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [stageName, setStageName] = useState("");
  const [split, setSplit] = useState("30");
  const [copied, setCopied] = useState(false);

  const create = useOrgMutation((body: { stageName: string; splitPercent: number }) =>
    createUnclaimedArtist(org.id, body),
  );

  if (!open) {
    return (
      <Button variant="secondary" className="self-start" icon={<PlusIcon className="h-5 w-5" />} onClick={() => setOpen(true)}>
        {t("org.addUnclaimed")}
      </Button>
    );
  }

  return (
    <section className="card flex flex-col gap-4 p-5">
      <div>
        <h3 className="font-semibold">{t("org.addUnclaimed")}</h3>
        <p className="text-sm text-muted">{t("org.unclaimedBody")}</p>
      </div>
      {create.data ? (
        <div className="flex flex-col gap-2">
          <Alert tone="success">{t("org.claimLinkReady")}</Alert>
          <div className="flex gap-2">
            <Input readOnly value={create.data.claimUrl} onFocus={(event) => event.target.select()} />
            <Button
              variant="secondary"
              icon={<ClipboardDocumentIcon className="h-5 w-5" />}
              onClick={() => navigator.clipboard.writeText(create.data!.claimUrl).then(() => setCopied(true))}
            >
              {copied ? t("common.copied") : t("org.copy")}
            </Button>
          </div>
          <p className="text-xs text-muted">{t("org.claimLinkOnce")}</p>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate({ stageName: stageName.trim(), splitPercent: Number(split) });
          }}
        >
          <Field label={t("studio.stageName")} className="flex-1"><Input value={stageName} onChange={(event) => setStageName(event.target.value)} required /></Field>
          <Field label={t("org.splitPercent")}><Input type="number" min={0} max={100} step={0.5} value={split} onChange={(event) => setSplit(event.target.value)} /></Field>
          <Button type="submit" loading={create.isPending}>{t("common.create")}</Button>
        </form>
      )}
      {create.isError && <Alert>{translatedError(create.error)}</Alert>}
    </section>
  );
}

export function PermissionChips({ permissions }: { permissions: ArtistPermission[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1">
      {permissions.map((permission) => <Badge key={permission}>{t(`org.permissions.${permission}`)}</Badge>)}
    </div>
  );
}

// ---------------------------------------------------------------- contracts (MGT-04 to MGT-06)

export function ContractsSection({ org, isManager }: SectionProps) {
  const { t } = useTranslation();
  const contracts = useOrgContracts(org.id);
  const respond = useOrgMutation(({ id, action }: { id: string; action: "end" | "cancel" }) => respondToContract(id, action));

  return (
    <div className="flex flex-col gap-4">
      {isManager && <ProposeContractForm org={org} />}
      {respond.isError && <Alert>{translatedError(respond.error)}</Alert>}
      {contracts.isPending && <PageLoader />}
      {contracts.data?.length === 0 && <EmptyState icon={<DocumentTextIcon />} title={t("org.noContracts")} />}
      <ul className="flex flex-col gap-2">
        {contracts.data?.map((contract) => (
          <ContractRow key={contract.id} contract={contract} side="org">
            {isManager && contract.status === "PENDING" && (
              <Button size="sm" variant="ghost" onClick={() => respond.mutate({ id: contract.id, action: "cancel" })}>{t("org.withdraw")}</Button>
            )}
            {isManager && contract.status === "ACTIVE" && (
              <Button size="sm" variant="danger" onClick={() => window.confirm(t("org.endConfirm")) && respond.mutate({ id: contract.id, action: "end" })}>
                {t("org.end")}
              </Button>
            )}
          </ContractRow>
        ))}
      </ul>
    </div>
  );
}

/** One contract, seen by the organisation or by the artist. */
export function ContractRow({ contract, side, children }: { contract: Contract; side: "org" | "artist"; children?: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const counterpart = side === "org" ? { name: contract.artist.stageName, image: contract.artist.avatarUrl } : { name: contract.org.name, image: contract.org.logoUrl };
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(i18n.language) : "");

  return (
    <li className="card flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar src={counterpart.image} alt="" className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{counterpart.name}</p>
          <p className="text-xs text-muted">
            {t("org.share", { percent: contract.splitPercent })} · {t("org.from", { date: date(contract.startsAt) })}
            {contract.endsAt && ` · ${t("org.until", { date: date(contract.endsAt) })}`}
            {contract.territory && ` · ${contract.territory}`}
          </p>
        </div>
        <Badge tone={contract.status === "ACTIVE" ? "strong" : contract.status === "PENDING" ? "accent" : "muted"}>{t(`org.status.${contract.status}`)}</Badge>
      </div>
      <PermissionChips permissions={contract.permissions} />
      {contract.notes && <p className="text-sm text-muted">{contract.notes}</p>}
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </li>
  );
}

function ProposeContractForm({ org }: { org: Organisation }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [artist, setArtist] = useState<ArtistSummary | null>(null);
  const [split, setSplit] = useState("20");
  const [permissions, setPermissions] = useState<ArtistPermission[]>(["MANAGE_RELEASES", "MANAGE_EVENTS", "VIEW_ANALYTICS"]);
  const [endsAt, setEndsAt] = useState("");
  const [notes, setNotes] = useState("");

  const propose = useOrgMutation((body: ContractProposal) => proposeContract(org.id, body));

  if (!open) {
    return (
      <Button className="self-start" icon={<PlusIcon className="h-5 w-5" />} onClick={() => setOpen(true)}>
        {t("org.propose")}
      </Button>
    );
  }

  const toggle = (permission: ArtistPermission) =>
    setPermissions((current) => (current.includes(permission) ? current.filter((p) => p !== permission) : [...current, permission]));

  return (
    <form
      className="card flex flex-col gap-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!artist) return;
        propose.mutate(
          {
            artistId: artist.id,
            splitPercent: Number(split),
            permissions,
            endsAt: endsAt ? new Date(`${endsAt}T23:59:59Z`).toISOString() : null,
            notes: notes.trim() || null,
          },
          {
            onSuccess: () => {
              setOpen(false);
              setArtist(null);
            },
          },
        );
      }}
    >
      <h3 className="font-semibold">{t("org.propose")}</h3>
      <Field label={t("org.artist")}>
        <SingleArtistSearch value={artist} onChange={setArtist} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("org.splitPercent")} hint={t("org.splitHint")}>
          <Input type="number" min={0} max={100} step={0.5} value={split} onChange={(event) => setSplit(event.target.value)} />
        </Field>
        <Field label={t("org.endsAt")} optional>
          <Input type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="label">{t("org.permissionsLabel")}</legend>
        {ARTIST_PERMISSIONS.map((permission) => (
          <Checkbox
            key={permission}
            checked={permissions.includes(permission)}
            onChange={() => toggle(permission)}
            label={<><span className="font-medium">{t(`org.permissions.${permission}`)}</span> <span className="text-muted">— {t(`org.permissionHelp.${permission}`)}</span></>}
          />
        ))}
      </fieldset>
      <Field label={t("org.notes")} optional><Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} /></Field>
      {propose.isError && <Alert>{translatedError(propose.error)}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" loading={propose.isPending} disabled={!artist || permissions.length === 0}>{t("org.send")}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
      </div>
    </form>
  );
}

function SingleArtistSearch({ value, onChange }: { value: ArtistSummary | null; onChange: (artist: ArtistSummary | null) => void }) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 250);
    return () => clearTimeout(timer);
  }, [input]);

  const results = useArtistPicker(query);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
        <Avatar src={value.avatarUrl} alt="" className="h-8 w-8" />
        <span className="flex-1 font-medium">{value.stageName}</span>
        <button type="button" className="text-xs font-semibold text-monkii-400 hover:underline" onClick={() => onChange(null)}>{t("common.edit")}</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder={t("studio.searchArtists")} />
      {results.data && results.data.items.length > 0 && (
        <ul className="absolute inset-x-0 top-12 z-20 rounded-xl border border-line bg-surface p-1 shadow-xl">
          {results.data.items.map((artist) => (
            <li key={artist.id}>
              <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated" onClick={() => onChange(artist)}>
                <Avatar src={artist.avatarUrl} alt="" className="h-7 w-7" />
                {artist.stageName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- team (MGT-02)

export function TeamSection({ org, isManager }: SectionProps) {
  const { t, i18n } = useTranslation();
  const members = useOrgMembers(org.id);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");

  const invite = useOrgMutation((body: { email: string; role: string }) => inviteMember(org.id, body));
  const remove = useOrgMutation((userId: string) => removeMember(org.id, userId));

  return (
    <div className="flex flex-col gap-4">
      {isManager && (
        <form
          className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            invite.mutate({ email: email.trim(), role }, { onSuccess: () => setEmail("") });
          }}
        >
          <Field label={t("auth.email")} className="flex-1"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
          <Field label={t("org.role")}>
            <Select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
              <option value="MEMBER">{t("org.roles.MEMBER")}</option>
              <option value="ADMIN">{t("org.roles.ADMIN")}</option>
            </Select>
          </Field>
          <Button type="submit" icon={<UserPlusIcon className="h-5 w-5" />} loading={invite.isPending}>{t("org.invite")}</Button>
        </form>
      )}
      {(invite.isError || remove.isError) && <Alert>{translatedError(invite.error ?? remove.error)}</Alert>}

      {members.isPending && <PageLoader />}
      <ul className="card divide-y divide-line">
        {members.data?.map((member) => (
          <li key={member.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{member.email}</p>
              <p className="text-xs text-muted">
                {member.status === "INVITED" ? t("org.invitationSent") : t("org.joined", { date: member.joinedAt ? new Date(member.joinedAt).toLocaleDateString(i18n.language) : "" })}
              </p>
            </div>
            <Badge tone={member.role === "OWNER" ? "strong" : "muted"}>{t(`org.roles.${member.role}`)}</Badge>
            {isManager && member.role !== "OWNER" && (
              <Button size="sm" variant="ghost" onClick={() => window.confirm(t("org.removeConfirm", { email: member.email })) && remove.mutate(member.userId)}>
                {t("common.delete")}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- imprints (MGT-03, labels only)

export function ImprintsSection({ org, isManager }: SectionProps) {
  const { t } = useTranslation();
  const imprints = useImprints(org.id, true);
  const [name, setName] = useState("");
  const add = useOrgMutation((value: string) => addImprint(org.id, value));
  const remove = useOrgMutation((id: string) => removeImprint(org.id, id));

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <p className="text-sm text-muted">{t("org.imprintsBody")}</p>
      {isManager && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) add.mutate(name.trim(), { onSuccess: () => setName("") });
          }}
        >
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("org.imprintName")} maxLength={120} />
          <Button type="submit" loading={add.isPending}>{t("common.create")}</Button>
        </form>
      )}
      {add.isError && <Alert>{translatedError(add.error)}</Alert>}
      {imprints.data?.length === 0 && <EmptyState title={t("org.noImprints")} />}
      <ul className="card divide-y divide-line">
        {imprints.data?.map((imprint) => (
          <li key={imprint.id} className="flex items-center justify-between px-4 py-3">
            <span className="font-medium">{imprint.name}</span>
            {isManager && <Button size="sm" variant="ghost" onClick={() => remove.mutate(imprint.id)}>{t("common.delete")}</Button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- audit (MGT-08)

export function AuditSection({ org }: { org: Organisation }) {
  const { t, i18n } = useTranslation();
  const audit = useAudit(org.id);

  if (audit.isPending) return <PageLoader />;
  if (!audit.data?.length) return <EmptyState icon={<DocumentTextIcon />} title={t("org.noAudit")} />;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2">{t("org.when")}</th>
            <th className="px-4 py-2">{t("org.who")}</th>
            <th className="px-4 py-2">{t("org.artist")}</th>
            <th className="px-4 py-2">{t("org.what")}</th>
          </tr>
        </thead>
        <tbody>
          {audit.data.map((entry) => (
            <tr key={entry.id} className="border-t border-line">
              <td className="whitespace-nowrap px-4 py-2 text-muted">{new Date(entry.at).toLocaleString(i18n.language, { dateStyle: "short", timeStyle: "short" })}</td>
              <td className="px-4 py-2">{entry.actor}</td>
              <td className="px-4 py-2">{entry.artist ?? "—"}</td>
              <td className="px-4 py-2">
                {t(`org.actions.${entry.action.replace(".", "_")}`, { defaultValue: entry.action })}
                {typeof entry.details?.title === "string" && <span className="text-muted"> · {entry.details.title}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
