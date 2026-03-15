import { describe, it, expect } from 'vitest';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  acceptInvitationSchema,
  removeMemberSchema,
} from '../../validation/organization.validation';

describe('Organization Validation', () => {
  describe('createOrganizationSchema', () => {
    it('should accept valid organization with name only', () => {
      const result = createOrganizationSchema.safeParse({ name: 'My Org' });
      expect(result.success).toBe(true);
    });

    it('should accept organization with all fields', () => {
      const result = createOrganizationSchema.safeParse({
        name: 'My Organization',
        slug: 'my-org',
        logo: 'https://example.com/logo.png',
        metadata: { industry: 'tech' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject name shorter than 2 characters', () => {
      const result = createOrganizationSchema.safeParse({ name: 'A' });
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const result = createOrganizationSchema.safeParse({ name: 'A'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('should reject slug with uppercase letters', () => {
      const result = createOrganizationSchema.safeParse({
        name: 'My Org',
        slug: 'My-Org',
      });
      expect(result.success).toBe(false);
    });

    it('should reject slug with spaces', () => {
      const result = createOrganizationSchema.safeParse({
        name: 'My Org',
        slug: 'my org',
      });
      expect(result.success).toBe(false);
    });

    it('should accept slug with hyphens and numbers', () => {
      const result = createOrganizationSchema.safeParse({
        name: 'My Org',
        slug: 'my-org-123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid logo URL', () => {
      const result = createOrganizationSchema.safeParse({
        name: 'My Org',
        logo: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateOrganizationSchema', () => {
    it('should accept partial updates', () => {
      const result = updateOrganizationSchema.safeParse({ name: 'Updated Name' });
      expect(result.success).toBe(true);
    });

    it('should accept empty object (no updates)', () => {
      const result = updateOrganizationSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('inviteMemberSchema', () => {
    it('should accept valid invitation', () => {
      const result = inviteMemberSchema.safeParse({
        email: 'user@example.com',
        role: 'member',
      });
      expect(result.success).toBe(true);
    });

    it('should accept owner role', () => {
      const result = inviteMemberSchema.safeParse({
        email: 'user@example.com',
        role: 'owner',
      });
      expect(result.success).toBe(true);
    });

    it('should accept admin role', () => {
      const result = inviteMemberSchema.safeParse({
        email: 'user@example.com',
        role: 'admin',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const result = inviteMemberSchema.safeParse({
        email: 'user@example.com',
        role: 'superadmin',
      });
      expect(result.success).toBe(false);
    });

    it('should normalize email to lowercase', () => {
      const result = inviteMemberSchema.parse({
        email: 'User@Example.COM',
        role: 'member',
      });
      expect(result.email).toBe('user@example.com');
    });
  });

  describe('updateMemberRoleSchema', () => {
    it('should accept valid role update', () => {
      const result = updateMemberRoleSchema.safeParse({
        memberId: 'member-1',
        role: 'admin',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty memberId', () => {
      const result = updateMemberRoleSchema.safeParse({
        memberId: '',
        role: 'admin',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('acceptInvitationSchema', () => {
    it('should accept valid token', () => {
      const result = acceptInvitationSchema.safeParse({ token: 'invite-token-123' });
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const result = acceptInvitationSchema.safeParse({ token: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('removeMemberSchema', () => {
    it('should accept valid memberId', () => {
      const result = removeMemberSchema.safeParse({ memberId: 'member-1' });
      expect(result.success).toBe(true);
    });

    it('should reject empty memberId', () => {
      const result = removeMemberSchema.safeParse({ memberId: '' });
      expect(result.success).toBe(false);
    });
  });
});
