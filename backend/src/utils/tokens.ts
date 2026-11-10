import { createHash, randomBytes } from "node:crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string;
  type: "access";
}

export function generateAccessToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"]
  };

  return jwt.sign(
    { type: "access" },
    env.JWT_ACCESS_SECRET,
    { ...options, subject: userId }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });

  if (
    typeof payload === "string" ||
    payload.type !== "access" ||
    typeof payload.sub !== "string"
  ) {
    throw new Error("Invalid access token");
  }

  return payload as AccessTokenPayload;
}

export function generateRefreshToken(): string {
  return randomBytes(64).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiry(): Date {
  const value = env.REFRESH_TOKEN_EXPIRES_IN;
  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    throw new Error("Invalid REFRESH_TOKEN_EXPIRES_IN format");
  }

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return new Date(Date.now() + amount * multipliers[unit]);
}