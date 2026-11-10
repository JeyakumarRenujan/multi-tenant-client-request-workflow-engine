import { NextFunction, Request, Response } from "express";
import {
  createRequest,
  getRequestById,
  listRequests,
  RequestError
} from "./request.service";
import {
  listRequestsSchema,
  requestIdSchema
} from "./request.validation";

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

    const createdRequest = await createRequest(req.body, req.authUser);

    res.status(201).json({
      success: true,
      message: "Request created successfully",
      data: { request: createdRequest }
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

export async function listRequestsController(
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

    const parsed = listRequestsSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid request filters",
        errors: parsed.error.flatten().fieldErrors
      });
      return;
    }

    const result = await listRequests(req.authUser, parsed.data);

    res.status(200).json({
      success: true,
      message: "Requests retrieved successfully",
      data: result
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

export async function getRequestByIdController(
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

    const parsedId = requestIdSchema.safeParse(req.params.id);

    if (!parsedId.success) {
      res.status(400).json({
        success: false,
        message: "Invalid request ID"
      });
      return;
    }

    const foundRequest = await getRequestById(
      parsedId.data,
      req.authUser
    );

    res.status(200).json({
      success: true,
      message: "Request retrieved successfully",
      data: { request: foundRequest }
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