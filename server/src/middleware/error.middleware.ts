import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const correlationId = req.headers['x-correlation-id'];
  console.error(`[${correlationId}] Unhandled Error:`, err?.message, err?.stack);

  res.status(500).json({
    status: 'ERROR',
    message: 'Internal server error',
    correlationId,
    error: process.env.NODE_ENV === 'development' ? err?.message : undefined,
  });
};