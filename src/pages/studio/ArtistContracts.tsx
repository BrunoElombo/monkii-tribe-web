import { useTranslation } from "react-i18next";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { Alert, Button, EmptyState, PageLoader } from "../../components/ui";
import { useArtistContracts, useOrgMutation } from "../../hooks/orgs";
import { respondToContract } from "../../services/org.service";
import type { Artist } from "../../types";
import { translatedError } from "../../utils/problems";
import { ContractRow } from "../org/OrgSections";

/**
 * The artist's side of contracts (MGT-04 to MGT-06): accept or decline
 * proposals, end an active contract. Pending proposals come first.
 */
export function ArtistContracts({ artist }: { artist: Artist }) {
  const { t } = useTranslation();
  const contracts = useArtistContracts(artist.id);
  const respond = useOrgMutation(({ id, action }: { id: string; action: "accept" | "reject" | "end" }) => respondToContract(id, action));

  if (contracts.isPending) return <PageLoader />;
  if (contracts.isError) return <Alert>{translatedError(contracts.error)}</Alert>;
  if (contracts.data.length === 0) return <EmptyState icon={<DocumentTextIcon />} title={t("contracts.none")} />;

  const order = { PENDING: 0, ACTIVE: 1, ENDED: 2, REJECTED: 3, CANCELLED: 4 };
  const sorted = [...contracts.data].sort((a, b) => order[a.status] - order[b.status]);
  const shared = contracts.data.filter((c) => c.status === "ACTIVE").reduce((sum, c) => sum + c.splitPercent, 0);

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">{t("contracts.explain", { shared, kept: Math.round((100 - shared) * 100) / 100 })}</Alert>
      {respond.isError && <Alert>{translatedError(respond.error)}</Alert>}
      <ul className="flex flex-col gap-2">
        {sorted.map((contract) => (
          <ContractRow key={contract.id} contract={contract} side="artist">
            {contract.status === "PENDING" && (
              <>
                <Button size="sm" loading={respond.isPending} onClick={() => respond.mutate({ id: contract.id, action: "accept" })}>{t("contracts.accept")}</Button>
                <Button size="sm" variant="secondary" onClick={() => respond.mutate({ id: contract.id, action: "reject" })}>{t("contracts.reject")}</Button>
              </>
            )}
            {contract.status === "ACTIVE" && (
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
