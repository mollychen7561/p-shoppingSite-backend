import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", err);

  if (!res.headersSent) {
    const statusCode = (err as any).statusCode || 500;
    const message =
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message;

    res.status(statusCode).json({
      message: "Internal server error",
      error: message
    });
  }
};
