import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { dashboardSummaryController } from "./dashboard.controller";

const router = Router();

router.get(
  "/summary",
  authenticate,
  dashboardSummaryController
);

export default router;
