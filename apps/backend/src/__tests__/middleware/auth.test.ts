import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { ForbiddenError } from '../../utils/errors.js';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
      },
    };
    mockResponse = {};
    nextFunction = vi.fn();
  });

  describe('requireAdmin', () => {
    it('should allow admin user', () => {
      mockRequest.user!.role = 'admin';

      requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should reject non-admin user', () => {
      mockRequest.user!.role = 'user';

      requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });
});
