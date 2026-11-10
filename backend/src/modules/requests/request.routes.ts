import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import {
  assignRequestController,
  createRequestController,
  getRequestByIdController,
  listRequestsController,
  updateRequestController,
  transitionRequestController,
  softDeleteRequestController
} from "./request.controller";
import { createRequestSchema } from "./request.validation";

const router = Router();

function validateCreateRequest(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction
) {
  const parsed = createRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid request details",
      errors: parsed.error.flatten().fieldErrors
    });
    return;
  }

  req.body = parsed.data;
  next();
}

router.post(
  "/",
  authenticate,
  authorize(UserRole.CLIENT_USER),
  validateCreateRequest,
  createRequestController
);

router.get(
  "/",
  authenticate,
  listRequestsController
);

router.patch(
  "/:id",
  authenticate,
  authorize(UserRole.MANAGER),
  updateRequestController
);

router.patch(
  "/:id/assignment",
  authenticate,
  authorize(UserRole.MANAGER),
  assignRequestController
);

router.patch(
  "/:id/status",
  authenticate,
  transitionRequestController,
  softDeleteRequestController
);

router.get(
  "/:id",
  authenticate,
  getRequestByIdController
);

export default router;
router.delete(
  "/:id",
  authenticate,
  authorize(UserRole.CLIENT_USER, UserRole.ORGANIZATION_ADMIN),
  softDeleteRequestController
);
