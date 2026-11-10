import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

export function validateRequestOrigin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const origin = req.get("Origin");

  if (!origin || origin !== env.FRONTEND_URL) {
    res.status(403).json({
      success: false,
      message: "Request origin is not allowed"
    });
    return;
  }

  next();
}