import { z } from "zod";

/** Forms of the sign-in, sign-up and password screens (the auth service checks the same rules). */

/** 8 characters at least, with a letter and a digit (AUTH-01). */
export const passwordSchema = z.string().min(8).regex(/[A-Za-z]/).regex(/\d/);

export const GENDERS = ["FEMALE", "MALE", "NON_BINARY", "UNDISCLOSED"] as const;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginValues = z.infer<typeof loginSchema>;

/** Sign-up, step 2. */
export const credentialsSchema = z.object({
  displayName: z.string().trim().min(2, "2+").max(60),
  email: z.string().email(),
  password: passwordSchema,
});
export type CredentialsValues = z.infer<typeof credentialsSchema>;

/** Sign-up, step 3: the demographics statistics rely on (ACC-02). */
export const aboutSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(GENDERS),
  country: z.string().length(2),
  region: z.string().min(1),
  city: z.string().max(80).optional().nullable(),
  acceptTerms: z.literal(true),
});
export type AboutValues = z.infer<typeof aboutSchema>;

export const forgotPasswordSchema = z.object({ email: z.string().email() });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({ password: passwordSchema });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
