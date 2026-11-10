import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./docs/openapi";
import { env } from "./config/env";
import authRoutes from "./modules/auth/auth.routes";
import requestRoutes from "./modules/requests/request.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import userRoutes from "./modules/users/user.routes";

const app = express();

app.use(helmet());

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// API documentation
app.get("/api/docs.json", (_req, res) => {
  res.status(200).json(openApiDocument);
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/requests", requestRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/users", userRoutes);

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Workflow Engine API is running",
    data: {
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
  });
});

export default app;
