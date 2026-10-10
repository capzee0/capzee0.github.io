import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

let requestCounter = 0;
export function generateRequestId(): string {
  return `req-${Date.now()}-${++requestCounter}`;
}

export function errorMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as Request & { requestId?: string }).requestId ?? generateRequestId();

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        requestId,
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';
  const message =
    statusCode >= 500
      ? 'An internal error occurred. Please try again.'
      : err.message;

  if (statusCode >= 500) {
    console.error('[error]', { requestId, message: err.message, stack: err.stack });
  }

  res.status(statusCode).json({
    success: false,
    error: { code, message, requestId },
  });
}

export function createError(message: string, statusCode: number, code: string): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

export function requestIdMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  (req as Request & { requestId?: string }).requestId = generateRequestId();
  next();
}
