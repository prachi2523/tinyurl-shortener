import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Unhandled Error:', err);
  
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
    },
  });
}
