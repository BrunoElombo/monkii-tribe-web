import { describe, expect, it } from "vitest";
import { artistProfileSchema, listenerProfileSchema } from "./profile.schemas";

describe("listener profile", () => {
  const profile = { displayName: "Ama", gender: "UNDISCLOSED", country: "CM", region: "Centre", city: "" };

  it("accepts a complete profile, with or without a city", () => {
    expect(listenerProfileSchema.safeParse(profile).success).toBe(true);
    expect(listenerProfileSchema.safeParse({ ...profile, city: null }).success).toBe(true);
  });

  it("needs a display name, a 2-letter country and a region", () => {
    expect(listenerProfileSchema.safeParse({ ...profile, displayName: " A" }).success).toBe(false);
    expect(listenerProfileSchema.safeParse({ ...profile, country: "Cameroon" }).success).toBe(false);
    expect(listenerProfileSchema.safeParse({ ...profile, region: "" }).success).toBe(false);
  });
});

describe("artist profile", () => {
  const artist = { stageName: "Kaysha", genres: ["makossa"], instagram: "", website: "https://kaysha.example" };

  it("accepts empty links and full URLs", () => {
    expect(artistProfileSchema.safeParse(artist).success).toBe(true);
  });

  it("refuses a link that is not a URL", () => {
    expect(artistProfileSchema.safeParse({ ...artist, instagram: "@kaysha" }).success).toBe(false);
  });

  it("allows 5 genres at most", () => {
    expect(artistProfileSchema.safeParse({ ...artist, genres: ["a", "b", "c", "d", "e", "f"] }).success).toBe(false);
  });

  it("needs a stage name", () => {
    expect(artistProfileSchema.safeParse({ ...artist, stageName: "  " }).success).toBe(false);
  });
});
