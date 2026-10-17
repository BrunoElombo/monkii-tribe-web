import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-display text-7xl font-bold text-monkii-500">404</p>
      <p className="text-muted">{t("common.notFound")}</p>
      <Link to="/" className="font-semibold text-monkii-400 hover:underline">{t("common.goHome")}</Link>
    </div>
  );
}
