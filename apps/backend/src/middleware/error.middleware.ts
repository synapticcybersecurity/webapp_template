/**
 * Error Handling Middleware
 * Centralized error processing and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { ApiResponse, HttpStatus, ErrorCode } from '@webapp/shared';

/**
 * Global error handler
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Log the error
  logger.error('Error caught by error handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });

  // Handle known error types
  if (err instanceof AppError) {
    handleAppError(err, res);
  } else if (err instanceof ZodError) {
    handleZodError(err, res);
  } else if (err instanceof PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
  } else {
    handleUnknownError(err, res);
  }
}

/**
 * Handle custom AppError instances
 */
function handleAppError(err: AppError, res: Response): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code: err.code,
      message: err.message,
      details: err.details,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(err.statusCode).json(response);
}

/**
 * Handle Zod validation errors
 */
function handleZodError(err: ZodError, res: Response): void {
  const details = err.errors.reduce(
    (acc, error) => {
      const path = error.path.join('.');
      acc[path] = error.message;
      return acc;
    },
    {} as Record<string, string>,
  );

  const response: ApiResponse = {
    success: false,
    error: {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      details,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(HttpStatus.UNPROCESSABLE_ENTITY).json(response);
}

/**
 * Handle Prisma database errors
 */
function handlePrismaError(err: PrismaClientKnownRequestError, res: Response): void {
  let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  let code = ErrorCode.DATABASE_ERROR;
  let message = 'Database error occurred';
  let details: Record<string, any> | undefined;

  switch (err.code) {
    case 'P2002': // Unique constraint violation
      statusCode = HttpStatus.CONFLICT;
      code = ErrorCode.ALREADY_EXISTS;
      message = 'A record with this value already exists';
      details = {
        target: err.meta?.target,
      };
      break;

    case 'P2025': // Record not found
      statusCode = HttpStatus.NOT_FOUND;
      code = ErrorCode.NOT_FOUND;
      message = 'Record not found';
      break;

    case 'P2003': // Foreign key constraint violation
      statusCode = HttpStatus.BAD_REQUEST;
      code = ErrorCode.INVALID_INPUT;
      message = 'Invalid reference - related record not found';
      details = {
        field: err.meta?.field_name,
      };
      break;

    case 'P2014': // Invalid ID
      statusCode = HttpStatus.BAD_REQUEST;
      code = ErrorCode.INVALID_INPUT;
      message = 'Invalid ID provided';
      break;

    default:
      logger.error('Unhandled Prisma error code:', err.code);
  }

  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        prismaCode: err.code,
      }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}

/**
 * Handle unknown/unhandled errors
 */
function handleUnknownError(err: Error, res: Response): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message:
        process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(HttpStatus.NOT_FOUND).json(response);
}
