import { Request, Response } from "express";
import { env } from "../../config/env";
import {
  AuthError,
  getCurrentUser,
  login,
  logout,
  refreshSession
} from "./auth.service";
import { getRefreshTokenExpiry } from "../../utils/tokens";

const cookieName = "workflow_refresh";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1/auth"
};

function setRefreshCookie(res: Response, token: string) {
  res.cookie(cookieName, token, {
    ...cookieOptions,
    expires: getRefreshTokenExpiry()
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(cookieName, cookieOptions);
}

function handleError(error: unknown, res: Response) {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
    return;
  }

  console.error("Authentication error:", error);
  res.status(500).json({
    success: false,
    message: "An unexpected authentication error occurred"
  });
}

export async function loginController(req: Request, res: Response) {
  try {
    const result = await login(req.body);
    setRefreshCookie(res, result.refreshToken);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken: result.accessToken,
        user: result.user
      }
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function refreshController(req: Request, res: Response) {
  try {
    const token = req.cookies?.[cookieName];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Refresh token is required"
      });
      return;
    }

    const result = await refreshSession(token);
    setRefreshCookie(res, result.refreshToken);

    res.status(200).json({
      success: true,
      message: "Session refreshed",
      data: { accessToken: result.accessToken }
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function logoutController(req: Request, res: Response) {
  try {
    await logout(req.cookies?.[cookieName]);
    clearRefreshCookie(res);

    res.status(200).json({
      success: true,
      message: "Logout successful"
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function meController(req: Request, res: Response) {
  try {
    const user = await getCurrentUser(req.authUser!.id);

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    handleError(error, res);
  }
}