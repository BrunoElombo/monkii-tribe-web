import { describe, expect, it } from "vitest";
import { aboutSchema, credentialsSchema, forgotPasswordSchema, loginSchema, passwordSchema, resetPasswordSchema } from "./auth.schemas";

describe("password rule", () => {
  it("accepts 8+ characters with a letter and a digit", () => {
    expect(passwordSchema.safeParse("wouri2027").success).toBe(true);
    expect(passwordSchema.safeParse("A1b2c3d4").success).toBe(true);
  });

  it("refuses short passwords, and passwords without a letter or a digit", () => {
    expect(passwordSchema.safeParse("abc123").success).toBe(false);
    expect(passwordSchema.safeParse("onlyletters").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
  });

  it("is the rule of the reset form too", () => {
    expect(resetPasswordSchema.safeParse({ password: "makossa99" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: "makossa" }).success).toBe(false);
  });
});

describe("sign-in", () => {
  it("needs a valid email and any password", () => {
    expect(loginSchema.safeParse({ email: "ama@monkii.test", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "ama", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "ama@monkii.test", password: "" }).success).toBe(false);
  });

  it("forgot password only asks for an email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "ama@monkii.test" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("sign-up", () => {
  const credentials = { displayName: "  Ama  ", email: "ama@monkii.test", password: "bikutsi2027" };

  it("trims the display name", () => {
    const result = credentialsSchema.safeParse(credentials);
    expect(result.success).toBe(true);
    expect(result.data?.displayName).toBe("Ama");
  });

  it("needs a display name of 2 to 60 characters, after trimming", () => {
    const short = credentialsSchema.safeParse({ ...credentials, displayName: " A " });
    expect(short.success).toBe(false);
    expect(short.error?.issues[0].message).toBe("2+");
    expect(credentialsSchema.safeParse({ ...credentials, displayName: "x".repeat(61) }).success).toBe(false);
  });

  it("applies the password rule", () => {
    expect(credentialsSchema.safeParse({ ...credentials, password: "short1" }).success).toBe(false);
  });

  const about = { birthDate: "2001-04-12", gender: "FEMALE", country: "CM", region: "Littoral", city: "Douala", acceptTerms: true };

  it("accepts the demographics step", () => {
    expect(aboutSchema.safeParse(about).success).toBe(true);
    expect(aboutSchema.safeParse({ ...about, city: null }).success).toBe(true);
    expect(aboutSchema.safeParse({ ...about, city: undefined }).success).toBe(true);
  });

  it("requires accepting the terms", () => {
    expect(aboutSchema.safeParse({ ...about, acceptTerms: false }).success).toBe(false);
  });

  it("checks the date format, gender, country code and region", () => {
    expect(aboutSchema.safeParse({ ...about, birthDate: "12/04/2001" }).success).toBe(false);
    expect(aboutSchema.safeParse({ ...about, gender: "OTHER" }).success).toBe(false);
    expect(aboutSchema.safeParse({ ...about, country: "CMR" }).success).toBe(false);
    expect(aboutSchema.safeParse({ ...about, region: "" }).success).toBe(false);
  });
});
