import { describe, it, expect } from 'vitest';
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  updateUserRoleSchema,
  banUserSchema,
} from '../../validation/auth.validation';

describe('Auth Validation', () => {
  describe('signUpSchema', () => {
    const validSignUp = {
      email: 'test@example.com',
      password: 'Password1!',
      name: 'Test User',
    };

    it('should accept valid signup data', () => {
      const result = signUpSchema.safeParse(validSignUp);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = signUpSchema.safeParse({ ...validSignUp, email: 'not-an-email' });
      expect(result.success).toBe(false);
    });

    it('should normalize email to lowercase', () => {
      const result = signUpSchema.parse({ ...validSignUp, email: 'Test@Example.COM' });
      expect(result.email).toBe('test@example.com');
    });

    it('should trim name whitespace', () => {
      const result = signUpSchema.parse({ ...validSignUp, name: '  Test User  ' });
      expect(result.name).toBe('Test User');
    });

    it('should reject password without uppercase', () => {
      const result = signUpSchema.safeParse({ ...validSignUp, password: 'password1!' });
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = signUpSchema.safeParse({ ...validSignUp, password: 'PASSWORD1!' });
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = signUpSchema.safeParse({ ...validSignUp, password: 'Password!' });
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const result = signUpSchema.safeParse({ ...validSignUp, password: 'Password1' });
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = signUpSchema.safeParse({ ...validSignUp, password: 'Pa1!' });
      expect(result.success).toBe(false);
    });

    it('should reject name shorter than 2 characters', () => {
      const result = signUpSchema.safeParse({ ...validSignUp, name: 'A' });
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const result = signUpSchema.safeParse({ ...validSignUp, name: 'A'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  describe('signInSchema', () => {
    it('should accept valid sign-in data', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
        password: 'any-password',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });

    it('should not enforce password complexity for sign-in', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
        password: 'simple',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should accept valid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'test@example.com' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should accept valid token and password', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123',
        password: 'NewPass1!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const result = resetPasswordSchema.safeParse({
        token: '',
        password: 'NewPass1!',
      });
      expect(result.success).toBe(false);
    });

    it('should enforce password complexity', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123',
        password: 'weak',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should accept valid passwords', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'old-password',
        newPassword: 'NewPass1!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty current password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: '',
        newPassword: 'NewPass1!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('should accept valid name update', () => {
      const result = updateProfileSchema.safeParse({ name: 'New Name' });
      expect(result.success).toBe(true);
    });

    it('should accept valid image URL', () => {
      const result = updateProfileSchema.safeParse({
        image: 'https://example.com/avatar.png',
      });
      expect(result.success).toBe(true);
    });

    it('should accept null image', () => {
      const result = updateProfileSchema.safeParse({ image: null });
      expect(result.success).toBe(true);
    });

    it('should reject invalid image URL', () => {
      const result = updateProfileSchema.safeParse({ image: 'not-a-url' });
      expect(result.success).toBe(false);
    });
  });

  describe('updateUserRoleSchema', () => {
    it('should accept valid role update', () => {
      const result = updateUserRoleSchema.safeParse({
        userId: 'user-1',
        role: 'admin',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const result = updateUserRoleSchema.safeParse({
        userId: 'user-1',
        role: 'superadmin',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('banUserSchema', () => {
    it('should accept valid ban data', () => {
      const result = banUserSchema.safeParse({
        userId: 'user-1',
        reason: 'Violated terms of service repeatedly',
      });
      expect(result.success).toBe(true);
    });

    it('should reject reason shorter than 10 characters', () => {
      const result = banUserSchema.safeParse({
        userId: 'user-1',
        reason: 'Short',
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional expiresAt', () => {
      const result = banUserSchema.safeParse({
        userId: 'user-1',
        reason: 'Temporary suspension for review',
        expiresAt: '2025-12-31T23:59:59Z',
      });
      expect(result.success).toBe(true);
    });
  });
});
