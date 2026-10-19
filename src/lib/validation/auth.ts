import { z } from "zod";

export const emailSchema = z.email({ message: "Enter a valid email address" }).max(254).toLowerCase();

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Password is too long")
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), "Include at least one letter and one number");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
});

export const signupSchema = z
  .object({
    displayName: z.string().trim().min(1, "Enter your name").max(80),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", { message: 'Type "DELETE" to confirm' }),
  password: z.string().min(1, "Enter your password"),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(80),
  timezone: z.string().trim().min(1).max(64),
  emailAlertsEnabled: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
