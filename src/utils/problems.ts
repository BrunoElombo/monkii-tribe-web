import i18n from "../i18n";
import { ApiError } from "../services/http";
import type { Problem } from "../types";

/** Turns an unknown error into a message for the UI. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (Array.isArray(error.details) && error.details.length && typeof error.details[0] === "string") {
      return `${error.message}: ${(error.details as string[]).join(" · ")}`;
    }
    return error.message;
  }
  return "Something went wrong";
}

/** True for an API "404 not found" (screens show their own message for it). */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Problems attached to a 409/422 API error, if any. */
export function problemsOf(error: unknown): Problem[] {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return [];
  return (error.details as unknown[]).filter((d): d is Problem => typeof d === "object" && d !== null && "code" in d);
}

/** Error message in the user's language: translated problems first, server message otherwise. */
export function translatedError(error: unknown): string {
  const problems = problemsOf(error);
  if (problems.length) return problems.map((p) => i18n.t(`problems.${p.code}`, { ...p.params, defaultValue: p.code })).join(" · ");
  if (error instanceof ApiError) return error.message;
  return i18n.t("common.error");
}
