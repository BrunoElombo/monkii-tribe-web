import { UseFormRegister, UseFormWatch, FieldErrors, Path } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useCountries } from "../hooks/user";
import { Field, Input, Select } from "./ui";

interface LocationValues {
  country: string;
  region: string;
  city?: string | null;
}

interface Props<T extends LocationValues> {
  register: UseFormRegister<T>;
  watch: UseFormWatch<T>;
  errors: FieldErrors<T>;
}

/**
 * Country + region + city. Cameroon (launch market) gets a region list,
 * other countries a free text field.
 */
export function LocationFields<T extends LocationValues>({ register, watch, errors }: Props<T>) {
  const { t, i18n } = useTranslation();
  const countries = useCountries();
  const country = watch("country" as Path<T>) as string;
  const regions = countries.data?.regions[country];
  const language = i18n.language === "fr" ? "fr" : "en";

  return (
    <>
      <Field label={t("auth.country")} error={errors.country?.message as string | undefined}>
        <Select {...register("country" as Path<T>)}>
          {countries.data?.countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name[language]}</option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("auth.region")} error={errors.region?.message as string | undefined}>
          {regions ? (
            <Select {...register("region" as Path<T>)}>
              <option value="">—</option>
              {regions.map((region) => <option key={region} value={region}>{region}</option>)}
            </Select>
          ) : (
            <Input {...register("region" as Path<T>)} />
          )}
        </Field>
        <Field label={t("auth.city")} optional>
          <Input {...register("city" as Path<T>)} />
        </Field>
      </div>
    </>
  );
}
