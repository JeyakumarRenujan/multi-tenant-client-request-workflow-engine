import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    if (!allowedRoles.includes(req.authUser.role as UserRole)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action"
      });
      return;
    }

    next();
  };
}