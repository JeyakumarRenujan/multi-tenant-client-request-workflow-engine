import { NextFunction, Request, Response } from "express";
import { getDashboardSummary } from "./dashboard.service";
import { RequestError } from "../requests/request.service";

export async function dashboardSummaryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.authUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const summary = await getDashboardSummary(req.authUser);

    res.status(200).json({
      success: true,
      message: "Dashboard summary retrieved successfully",
      data: summary
    });
  } catch (error) {
    if (error instanceof RequestError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
      return;
    }

    next(error);
  }
}
