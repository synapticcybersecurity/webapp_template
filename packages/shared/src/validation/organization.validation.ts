/**
 * Organization Validation Schemas
 * Using Zod for runtime validation and type inference
 */

import { z } from 'zod';

// Organization name validation
const organizationNameSchema = z
  .string()
  .min(2, 'Organization name must be at least 2 characters')
  .max(100, 'Organization name must be less than 100 characters')
  .trim();

// Organization slug validation (URL-friendly)
const slugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .trim();

// Create organization validation
export const createOrganizationSchema = z.object({
  name: organizationNameSchema,
  slug: slugSchema.optional(),
  logo: z.string().url('Invalid logo URL').optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

// Update organization validation
export const updateOrganizationSchema = z.object({
  name: organizationNameSchema.optional(),
  slug: slugSchema.optional(),
  logo: z.string().url('Invalid logo URL').optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

// Invite member validation
export const inviteMemberSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(3, 'Email must be at least 3 characters')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  role: z.enum(['owner', 'admin', 'member'], {
    errorMap: () => ({ message: 'Role must be "owner", "admin", or "member"' }),
  }),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

// Update member role validation
export const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  role: z.enum(['owner', 'admin', 'member'], {
    errorMap: () => ({ message: 'Role must be "owner", "admin", or "member"' }),
  }),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

// Accept invitation validation
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

// Remove member validation
export const removeMemberSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
