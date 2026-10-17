import { useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { BuildingOffice2Icon, EnvelopeOpenIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../auth/AuthProvider";
import { Avatar } from "../../components/Cover";
import { EarningsPanel } from "../../components/EarningsPanel";
import { ImageUpload } from "../../components/ImageUpload";
import { Alert, Badge, Button, EmptyState, Field, Input, PageLoader, Textarea } from "../../components/ui";
import { useCurrentOrg, useOrgMutation } from "../../hooks/orgs";
import { acceptInvitation, createOrg, updateOrg } from "../../services/org.service";
import type { Organisation } from "../../types";
import { translatedError } from "../../utils/problems";
import { AuditSection, ContractsSection, ImprintsSection, RosterSection, TeamSection } from "./OrgSections";

const TABS = ["roster", "contracts", "team", "imprints", "earnings", "audit", "profile"] as const;
type Tab = (typeof TABS)[number];

/** Console of labels and managers (MGT-01 to MGT-09). */
export function OrgPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const current = useCurrentOrg();
  const [params, setParams] = useSearchParams();

  if (!user) return null;
  if (current.isPending) return <PageLoader />;
  if (current.isError) return <Alert>{translatedError(current.error)}</Alert>;

  const { org, invitations } = current;

  if (!org) {
    return (
      <div className="flex flex-col gap-6">
        {invitations.map((invitation) => <InvitationCard key={invitation.id} org={invitation} />)}
        {user.accountType === "LABEL" || user.accountType === "MANAGER" ? (
          <OrgForm />
        ) : (
          invitations.length === 0 && <EmptyState icon={<BuildingOffice2Icon />} title={t("org.notAnOrgAccount")} action={<Link to="/settings" className="text-sm font-semibold text-monkii-400 hover:underline">{t("nav.settings")}</Link>} />
        )}
      </div>
    );
  }

  const tabs = TABS.filter((tab) => tab !== "imprints" || org.type === "LABEL");
  const tab: Tab = tabs.includes(params.get("tab") as Tab) ? (params.get("tab") as Tab) : "roster";
  const isManager = org.myRole === "OWNER" || org.myRole === "ADMIN";

  return (
    <div className="flex flex-col gap-6">
      {invitations.map((invitation) => <InvitationCard key={invitation.id} org={invitation} />)}

      <header className="flex flex-wrap items-center gap-4">
        <Avatar src={org.logoUrl} alt={org.name} className="h-16 w-16" />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">{t(`org.types.${org.type}`)}</p>
          <h1 className="text-2xl font-semibold">{org.name}</h1>
        </div>
        {org.myRole && <Badge tone="accent">{t(`org.roles.${org.myRole}`)}</Badge>}
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((key) => (
          <button
            key={key}
            onClick={() => setParams({ tab: key }, { replace: true })}
            className={clsx("whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold", tab === key ? "bg-monkii-500 text-monkii-ink" : "bg-surface text-muted")}
          >
            {t(`org.tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === "roster" && <RosterSection org={org} isManager={isManager} />}
      {tab === "contracts" && <ContractsSection org={org} isManager={isManager} />}
      {tab === "team" && <TeamSection org={org} isManager={isManager} />}
      {tab === "imprints" && <ImprintsSection org={org} isManager={isManager} />}
      {tab === "earnings" && <EarningsPanel beneficiary={{ type: "ORG", id: org.id }} canWithdraw={isManager} />}
      {tab === "audit" && <AuditSection org={org} />}
      {tab === "profile" && (isManager ? <OrgForm org={org} /> : <Alert tone="info">{t("org.onlyManagers")}</Alert>)}
    </div>
  );
}

/** Create (MGT-01) or edit the organisation profile. */
function OrgForm({ org }: { org?: Organisation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [values, setValues] = useState({
    name: org?.name ?? "",
    contactEmail: org?.contactEmail ?? user?.email ?? "",
    description: org?.description ?? "",
    country: org?.country ?? "CM",
    legalName: org?.legalName ?? "",
    taxId: org?.taxId ?? "",
    logoUrl: org?.logoUrl ?? null,
  });
  const [saved, setSaved] = useState(false);

  const save = useOrgMutation((body: typeof values) => {
    const input = { ...body, description: body.description || null, legalName: body.legalName || null, taxId: body.taxId || null };
    return org ? updateOrg(org.id, input) : createOrg(input);
  });

  const set = (key: keyof typeof values) => (event: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: event.target.value }));

  return (
    <form
      className="card flex max-w-2xl flex-col gap-4 p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(false);
        save.mutate(values, { onSuccess: () => setSaved(true) });
      }}
    >
      {!org && (
        <div>
          <h1 className="text-2xl font-semibold">{t(user?.accountType === "LABEL" ? "org.createLabel" : "org.createManagement")}</h1>
          <p className="text-sm text-muted">{t("org.createBody")}</p>
        </div>
      )}
      {save.isError && <Alert>{translatedError(save.error)}</Alert>}

      <div className="flex items-center gap-4">
        <ImageUpload purpose="AVATAR" label={t("org.logo")} className="w-20" onUploaded={(asset) => setValues((v) => ({ ...v, logoUrl: asset.variants?.["300"] ?? null }))}>
          <Avatar src={values.logoUrl} alt="" className="w-20" />
        </ImageUpload>
        <p className="text-sm text-muted">{t("org.logo")}</p>
      </div>

      <Field label={t("org.name")}><Input value={values.name} onChange={set("name")} required minLength={2} maxLength={120} /></Field>
      <Field label={t("org.contactEmail")}><Input type="email" value={values.contactEmail} onChange={set("contactEmail")} required /></Field>
      <Field label={t("org.description")} optional><Textarea rows={4} value={values.description} onChange={set("description")} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("auth.country")}><Input value={values.country} onChange={set("country")} maxLength={2} /></Field>
        <Field label={t("org.legalName")} optional><Input value={values.legalName} onChange={set("legalName")} /></Field>
        <Field label={t("org.taxId")} optional><Input value={values.taxId} onChange={set("taxId")} /></Field>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={save.isPending}>{org ? t("common.save") : t("common.create")}</Button>
        {saved && <span className="text-sm text-monkii-400">{t("common.saved")}</span>}
      </div>
    </form>
  );
}

function InvitationCard({ org }: { org: Organisation }) {
  const { t } = useTranslation();
  const accept = useOrgMutation(() => acceptInvitation(org.id));

  return (
    <div className="card flex flex-wrap items-center gap-4 border-monkii-500/50 p-4">
      <EnvelopeOpenIcon className="h-8 w-8 text-monkii-500" />
      <div className="flex-1">
        <p className="font-semibold">{t("org.invitedTitle", { org: org.name })}</p>
        <p className="text-sm text-muted">{t("org.invitedBody", { role: t(`org.roles.${org.myRole ?? "MEMBER"}`) })}</p>
      </div>
      {accept.isError && <Alert>{translatedError(accept.error)}</Alert>}
      <Button loading={accept.isPending} onClick={() => accept.mutate(undefined)}>{t("org.acceptInvitation")}</Button>
    </div>
  );
}

/** Link from the ORG_INVITATION notification. */
export function OrgInvitationPage() {
  const { orgId = "" } = useParams();
  const current = useCurrentOrg();
  if (current.isPending) return <PageLoader />;

  const invitation = current.invitations.find((org) => org.id === orgId);
  if (!invitation) return <Navigate to="/org" replace />;
  return (
    <div className="mx-auto max-w-2xl">
      <InvitationCard org={invitation} />
    </div>
  );
}

/** "/contracts" (from notifications): the organisation console or the artist's studio. */
export function ContractsRedirect() {
  const { user } = useAuth();
  const current = useCurrentOrg();
  if (current.isPending) return <PageLoader />;
  return <Navigate to={current.org && user?.accountType !== "ARTIST" ? "/org?tab=contracts" : "/studio?tab=contracts"} replace />;
}
