import { describe, it, expect } from 'vitest';
import { createCheckoutSchema } from '../../validation/billing.validation';

describe('Billing Validation', () => {
  describe('createCheckoutSchema', () => {
    it('should accept valid pro monthly checkout', () => {
      const result = createCheckoutSchema.safeParse({
        plan: 'pro',
        interval: 'monthly',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid enterprise yearly checkout', () => {
      const result = createCheckoutSchema.safeParse({
        plan: 'enterprise',
        interval: 'yearly',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid plan', () => {
      const result = createCheckoutSchema.safeParse({
        plan: 'free',
        interval: 'monthly',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('pro');
      }
    });

    it('should reject invalid interval', () => {
      const result = createCheckoutSchema.safeParse({
        plan: 'pro',
        interval: 'weekly',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('monthly');
      }
    });

    it('should reject missing fields', () => {
      const result = createCheckoutSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
