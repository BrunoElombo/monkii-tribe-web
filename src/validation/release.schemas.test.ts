import { describe, expect, it } from "vitest";
import { releaseDetailsSchema } from "./release.schemas";

const details = {
  title: "Wouri Nights",
  type: "EP",
  releaseDate: "2027-03-01",
  genre: "makossa",
  subGenre: "",
  moods: "festive, warm",
  language: "fr",
  labelName: "",
  upc: "",
  copyrightLine: "",
  phonographicLine: "",
  description: "",
  explicit: false,
  priceXaf: "",
};

const issuesOf = (values: Record<string, unknown>) =>
  releaseDetailsSchema.safeParse({ ...details, ...values }).error?.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) ?? [];

describe("release details", () => {
  it("accepts a draft with empty optional fields", () => {
    expect(issuesOf({})).toEqual([]);
  });

  it("needs a title (trimmed) of at most 200 characters", () => {
    expect(issuesOf({ title: "   " })).toHaveLength(1);
    expect(issuesOf({ title: "x".repeat(201) })).toHaveLength(1);
    expect(releaseDetailsSchema.parse({ ...details, title: "  Wouri Nights " }).title).toBe("Wouri Nights");
  });

  it("only knows the release types of the catalog", () => {
    expect(issuesOf({ type: "ALBUM" })).toEqual([]);
    expect(issuesOf({ type: "BOOTLEG" })).toHaveLength(1);
  });

  it("takes an empty UPC or 12 to 14 digits", () => {
    expect(issuesOf({ upc: "123456789012" })).toEqual([]);
    expect(issuesOf({ upc: "12345678901234" })).toEqual([]);
    expect(issuesOf({ upc: "12345" })).toEqual(["upc: 12–14 digits"]);
    expect(issuesOf({ upc: "12345678901A" })).toEqual(["upc: 12–14 digits"]);
  });

  it("takes an empty price (not for sale) or 3 to 7 digits", () => {
    expect(issuesOf({ priceXaf: "500" })).toEqual([]);
    expect(issuesOf({ priceXaf: "1000000" })).toEqual([]);
    expect(issuesOf({ priceXaf: "50" })).toEqual(["priceXaf: 100 – 1 000 000"]);
    expect(issuesOf({ priceXaf: "12.5" })).toEqual(["priceXaf: 100 – 1 000 000"]);
  });

  it("keeps the language to a 2-letter code", () => {
    expect(issuesOf({ language: "fra" })).toHaveLength(1);
  });

  it("needs the explicit flag", () => {
    expect(issuesOf({ explicit: undefined })).toHaveLength(1);
  });
});
