import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import {
  createUserController,
  listUsersController,
  updateUserController,
  updateUserStatusController
} from "./user.controller";

const router = Router();

router.use(authenticate, authorize(UserRole.ORGANIZATION_ADMIN));

router.post("/", createUserController);
router.get("/", listUsersController);
router.patch("/:id", updateUserController);
router.patch("/:id/status", updateUserStatusController);

export default router;
