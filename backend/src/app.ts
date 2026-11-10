import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import authRoutes from "./modules/auth/auth.routes";

const app = express();

app.use(helmet());

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/api/v1/auth", authRoutes);

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
