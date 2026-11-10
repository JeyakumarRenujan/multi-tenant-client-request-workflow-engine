import { NextFunction, Request, Response } from "express";
import {
  assignRequest,
  createRequest,
  getRequestById,
  listRequests,
  RequestError,
  updateRequest
} from "./request.service";
import {
  assignRequestSchema,
  listRequestsSchema,
  requestIdSchema,
  updateRequestSchema
} from "./request.validation";

function sendRequestError(
  error: unknown,
  res: Response,
  next: NextFunction
) {
  if (error instanceof RequestError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
    return;
  }

  next(error);
}

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
    sendRequestError(error, res, next);
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
    sendRequestError(error, res, next);
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
    sendRequestError(error, res, next);
  }
}

export async function updateRequestController(
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
    const parsedBody = updateRequestSchema.safeParse(req.body);

    if (!parsedId.success || !parsedBody.success) {
      res.status(400).json({
        success: false,
        message: "Invalid request update details",
        errors: !parsedBody.success
          ? parsedBody.error.flatten().fieldErrors
          : { id: ["Invalid request ID"] }
      });
      return;
    }

    const updatedRequest = await updateRequest(
      parsedId.data,
      parsedBody.data,
      req.authUser
    );

    res.status(200).json({
      success: true,
      message: "Request updated successfully",
      data: { request: updatedRequest }
    });
  } catch (error) {
    sendRequestError(error, res, next);
  }
}

export async function assignRequestController(
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
    const parsedBody = assignRequestSchema.safeParse(req.body);

    if (!parsedId.success || !parsedBody.success) {
      res.status(400).json({
        success: false,
        message: "Invalid request assignment details",
        errors: !parsedBody.success
          ? parsedBody.error.flatten().fieldErrors
          : { id: ["Invalid request ID"] }
      });
      return;
    }

    const updatedRequest = await assignRequest(
      parsedId.data,
      parsedBody.data,
      req.authUser
    );

    res.status(200).json({
      success: true,
      message: "Request assignment updated successfully",
      data: { request: updatedRequest }
    });
  } catch (error) {
    sendRequestError(error, res, next);
  }
}