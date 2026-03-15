/**
 * Billing Validation Schemas
 * Using Zod for runtime validation and type inference
 */

import { z } from 'zod';

export const createCheckoutSchema = z.object({
  plan: z.enum(['pro', 'enterprise'], {
    errorMap: () => ({ message: 'Plan must be "pro" or "enterprise"' }),
  }),
  interval: z.enum(['monthly', 'yearly'], {
    errorMap: () => ({ message: 'Interval must be "monthly" or "yearly"' }),
  }),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
