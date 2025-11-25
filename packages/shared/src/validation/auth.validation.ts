/**
 * Authentication Validation Schemas
 * Using Zod for runtime validation and type inference
 */

import { z } from 'zod';

// Password validation rules
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

// Email validation
const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(3, 'Email must be at least 3 characters')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim();

// Name validation
const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .trim();

// Sign up validation
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;

// Sign in validation
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type SignInInput = z.infer<typeof signInSchema>;

// Forgot password validation
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// Reset password validation
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Verify email validation
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// Update profile validation
export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  image: z.string().url('Invalid image URL').optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Change password validation
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Admin: Update user role validation
export const updateUserRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['user', 'admin'], {
    errorMap: () => ({ message: 'Role must be either "user" or "admin"' }),
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// Admin: Ban user validation
export const banUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
  expiresAt: z.string().datetime().optional(),
});

export type BanUserInput = z.infer<typeof banUserSchema>;

// Admin: Unban user validation
export const unbanUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type UnbanUserInput = z.infer<typeof unbanUserSchema>;
