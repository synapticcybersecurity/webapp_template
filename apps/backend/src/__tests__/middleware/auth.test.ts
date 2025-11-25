import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireRole } from '../../middleware/auth.middleware.js';
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

  describe('requireRole', () => {
    it('should allow user with correct role', () => {
      mockRequest.user!.role = 'admin';
      const middleware = requireRole('admin');

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should allow user with one of multiple roles', () => {
      mockRequest.user!.role = 'admin';
      const middleware = requireRole('user', 'admin');

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should throw ForbiddenError for insufficient permissions', () => {
      mockRequest.user!.role = 'user';
      const middleware = requireRole('admin');

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }).toThrow(ForbiddenError);
    });

    it('should throw error with correct message', () => {
      mockRequest.user!.role = 'user';
      const middleware = requireRole('admin');

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }).toThrow('Insufficient permissions');
    });

    it('should not call next() when role check fails', () => {
      mockRequest.user!.role = 'user';
      const middleware = requireRole('admin');

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }).toThrow();

      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
