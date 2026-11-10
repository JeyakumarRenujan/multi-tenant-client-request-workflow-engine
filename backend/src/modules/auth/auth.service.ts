import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashToken
} from "../../utils/tokens";
import { LoginInput } from "./auth.validation";

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  organizationId: true,
  clientId: true,
  isActive: true
} as const;

export async function login(input: LoginInput) {
  const email = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email }
  });

  // Use the same error for unknown users and incorrect passwords.
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AuthError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AuthError("This account is inactive", 403);
  }

  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshTokenExpiry()
    }
  });

  return {
    accessToken: generateAccessToken(user.id),
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      clientId: user.clientId
    }
  };
}

export async function refreshSession(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (
    !storedToken ||
    storedToken.revokedAt ||
    storedToken.expiresAt <= now
  ) {
    throw new AuthError("Invalid or expired refresh token", 401);
  }

  if (!storedToken.user.isActive) {
    throw new AuthError("This account is inactive", 403);
  }

  const newRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRefreshToken);
  const newExpiry = getRefreshTokenExpiry();

  // Only one concurrent refresh can consume the old token.
  const result = await prisma.$transaction(async (tx) => {
    const consumed = await tx.refreshToken.updateMany({
      where: {
        id: storedToken.id,
        revokedAt: null,
        expiresAt: { gt: now }
      },
      data: { revokedAt: now }
    });

    if (consumed.count !== 1) {
      throw new AuthError("Refresh token has already been used", 401);
    }

    await tx.refreshToken.create({
      data: {
        userId: storedToken.userId,
        tokenHash: newTokenHash,
        expiresAt: newExpiry
      }
    });

    return true;
  });

  if (!result) {
    throw new AuthError("Unable to refresh session", 401);
  }

  return {
    accessToken: generateAccessToken(storedToken.userId),
    refreshToken: newRefreshToken
  };
}

export async function logout(rawToken?: string) {
  if (!rawToken) return;

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash: hashToken(rawToken),
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect
  });

  if (!user || !user.isActive) {
    throw new AuthError("User account is unavailable", 401);
  }

  return user;
}

export const availableRoles = Object.values(UserRole);