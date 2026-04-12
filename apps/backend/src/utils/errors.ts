/**
 * Custom Error Classes
 * Standardized error handling across the application
 */

import { HttpStatus, ErrorCode } from '@webapp/shared';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    code: string = ErrorCode.INTERNAL_ERROR,
    isOperational: boolean = true,
    details?: Record<string, any>,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: Record<string, any>) {
    super(message, HttpStatus.BAD_REQUEST, ErrorCode.INVALID_INPUT, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: Record<string, any>) {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, true, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: Record<string, any>) {
    super(message, HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: Record<string, any>) {
    super(message, HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, true, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: Record<string, any>) {
    super(message, HttpStatus.CONFLICT, ErrorCode.CONFLICT, true, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: Record<string, any>) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.VALIDATION_ERROR, true, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', details?: Record<string, any>) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, ErrorCode.RATE_LIMIT_EXCEEDED, true, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: Record<string, any>) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR, false, details);
  }
}
