import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyAccessToken } from "../utils/tokens";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        role: string;
        organizationId: string | null;
        clientId: string | null;
        isActive: boolean;
      };
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        organizationId: true,
        clientId: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "User account is unavailable"
      });
      return;
    }

    req.authUser = user;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired access token"
    });
  }
}