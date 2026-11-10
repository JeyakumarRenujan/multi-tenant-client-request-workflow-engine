import { NextFunction, Request, Response } from "express";
import {
  createRequest,
  RequestError
} from "./request.service";

export async function createRequestController(
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

    const request = await createRequest(req.body, req.authUser);

    res.status(201).json({
      success: true,
      message: "Request created successfully",
      data: { request }
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