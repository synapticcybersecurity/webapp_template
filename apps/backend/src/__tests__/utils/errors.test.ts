import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../utils/errors.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with message and status code', () => {
      const error = new AppError('Test error', 500);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('Error');
    });

    it('should be instanceof Error', () => {
      const error = new AppError('Test error', 500);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('BadRequestError', () => {
    it('should create 400 error', () => {
      const error = new BadRequestError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create 401 error', () => {
      const error = new UnauthorizedError('Not authenticated');
      expect(error.message).toBe('Not authenticated');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('ForbiddenError', () => {
    it('should create 403 error', () => {
      const error = new ForbiddenError('Access denied');
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should create 404 error', () => {
      const error = new NotFoundError('Resource not found');
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('ConflictError', () => {
    it('should create 409 error', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('ValidationError', () => {
    it('should create 422 error with validation errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ];
      const error = new ValidationError('Validation failed', errors);

      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(422);
      expect(error.errors).toEqual(errors);
    });

    it('should work without errors array', () => {
      const error = new ValidationError('Validation failed');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(422);
      expect(error.errors).toBeUndefined();
    });
  });
});
