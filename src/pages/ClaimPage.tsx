import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HandRaisedIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../auth/AuthProvider";
import { Alert, Button } from "../components/ui";
import { useMyArtist } from "../hooks/user";
import { changeAccountType } from "../services/auth.service";
import { claimArtist } from "../services/user.service";
import { translatedError } from "../utils/problems";

/**
 * MGT-07: an artist signed by a label before joining takes over the profile
 * the label created. Releases, events and statistics stay attached to it;
 * the label's provisional contract then waits for the artist's approval.
 */
export function ClaimPage() {
  const { t } = useTranslation();
  const { user, reload } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const myArtist = useMyArtist();
  const here = `/claim?token=${encodeURIComponent(token)}`;

  const claim = useMutation({
    mutationFn: async () => {
      if (user?.accountType === "LISTENER") {
        await changeAccountType("ARTIST");
        await reload();
      }
      return claimArtist(token);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["artists"] });
      navigate("/studio?tab=contracts", { replace: true });
    },
  });

  const blocked = user && (user.accountType === "LABEL" || user.accountType === "MANAGER" || Boolean(myArtist.data));

  return (
    <div className="card mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center">
      <HandRaisedIcon className="h-12 w-12 text-monkii-500" />
      <h1 className="text-2xl font-semibold">{t("claim.title")}</h1>
      <p className="text-sm text-muted">{t("claim.body")}</p>

      {!token && <Alert>{t("claim.missingToken")}</Alert>}

      {token && !user && (
        <div className="flex flex-wrap justify-center gap-2">
          <Link to="/register?type=artist" state={{ from: here }}><Button>{t("common.signUp")}</Button></Link>
          <Link to="/login" state={{ from: here }}><Button variant="secondary">{t("common.signIn")}</Button></Link>
        </div>
      )}

      {token && user && blocked && <Alert tone="info">{myArtist.data ? t("claim.alreadyArtist") : t("claim.wrongAccount")}</Alert>}

      {token && user && !blocked && (
        <>
          {!user.emailVerified && <Alert tone="info">{t("studio.verifyFirst")}</Alert>}
          {claim.isError && <Alert>{translatedError(claim.error)}</Alert>}
          <Button size="lg" loading={claim.isPending} onClick={() => claim.mutate()}>{t("claim.button")}</Button>
          {user.accountType === "LISTENER" && <p className="text-xs text-muted">{t("claim.becomesArtist")}</p>}
        </>
      )}
    </div>
  );
}
