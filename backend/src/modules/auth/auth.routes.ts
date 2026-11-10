import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../../middleware/auth.middleware";
import { validateRequestOrigin } from "../../middleware/origin.middleware";
import {
  loginController,
  logoutController,
  meController,
  refreshController
} from "./auth.controller";
import { loginSchema } from "./auth.validation";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later."
  }
});

router.post("/login", authLimiter, (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid login details",
      errors: parsed.error.flatten().fieldErrors
    });
    return;
  }

  req.body = parsed.data;
  next();
}, loginController);

router.post("/refresh", authLimiter, validateRequestOrigin, refreshController);
router.post("/logout", validateRequestOrigin, logoutController);
router.get("/me", authenticate, meController);

export default router;