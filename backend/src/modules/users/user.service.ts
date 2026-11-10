import bcrypt from "bcryptjs";
import { UserRole, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  CreateUserInput,
  ListUsersInput,
  UpdateUserInput
} from "./user.validation";

const managedRoles = [
  UserRole.MANAGER,
  UserRole.DEVELOPER,
  UserRole.CLIENT_USER
];

export class UserManagementError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "UserManagementError";
  }
}

type UserActor = {
  id: string;
  role: string;
  organizationId: string | null;
};

function requireOrganizationAdmin(actor: UserActor) {
  if (actor.role !== UserRole.ORGANIZATION_ADMIN) {
    throw new UserManagementError(
      "Only Organization Admins can manage users",
      403
    );
  }

  if (!actor.organizationId) {
    throw new UserManagementError(
      "Your account is not associated with an organization",
      403
    );
  }

  return actor.organizationId;
}

async function validateClient(
  clientId: string | null | undefined,
  organizationId: string
) {
  if (!clientId) return null;

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true }
  });

  if (!client) {
    throw new UserManagementError(
      "The selected client does not belong to your organization",
      400
    );
  }

  return client.id;
}

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  organizationId: true,
  clientId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} as const;

function handleDatabaseError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new UserManagementError(
      "A user with this email address already exists",
      409
    );
  }

  throw error;
}

export async function createUser(
  input: CreateUserInput,
  actor: UserActor
) {
  const organizationId = requireOrganizationAdmin(actor);

  if (input.role !== UserRole.MANAGER && input.role !== UserRole.DEVELOPER && input.role !== UserRole.CLIENT_USER) {
    throw new UserManagementError("This role cannot be created", 403);
  }

  const clientId = input.role === UserRole.CLIENT_USER
    ? await validateClient(input.clientId, organizationId)
    : null;

  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
        organizationId,
        clientId
      },
      select: publicUserSelect
    });
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function listUsers(
  filters: ListUsersInput,
  actor: UserActor
) {
  const organizationId = requireOrganizationAdmin(actor);
  const where: Prisma.UserWhereInput = {
    organizationId,
    role: { in: managedRoles },
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.isActive !== undefined
      ? { isActive: filters.isActive }
      : {})
  };

  const skip = (filters.page - 1) * filters.limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: publicUserSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: filters.limit
    }),
    prisma.user.count({ where })
  ]);

  return {
    users,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit)
    }
  };
}

export async function updateUser(
  userId: string,
  input: UpdateUserInput,
  actor: UserActor
) {
  const organizationId = requireOrganizationAdmin(actor);

  if (userId === actor.id) {
    throw new UserManagementError(
      "You cannot modify your own account through user management",
      403
    );
  }

  const existing = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId,
      role: { in: managedRoles }
    }
  });

  if (!existing) {
    throw new UserManagementError("User not found", 404);
  }

  const nextRole = input.role ?? existing.role;
  const nextClientId = input.clientId !== undefined
    ? input.clientId
    : existing.clientId;

  if (nextRole === UserRole.CLIENT_USER) {
    if (!nextClientId) {
      throw new UserManagementError(
        "A client must be assigned to a Client User",
        400
      );
    }
    await validateClient(nextClientId, organizationId);
  } else if (nextClientId) {
    throw new UserManagementError(
      "Only Client Users can be assigned to a client",
      400
    );
  }

  try {
    return await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined
          ? { email: input.email.toLowerCase() }
          : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.clientId !== undefined || input.role !== undefined
          ? { clientId: nextRole === UserRole.CLIENT_USER ? nextClientId : null }
          : {})
      },
      select: publicUserSelect
    });
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function updateUserStatus(
  userId: string,
  isActive: boolean,
  actor: UserActor
) {
  const organizationId = requireOrganizationAdmin(actor);

  if (userId === actor.id) {
    throw new UserManagementError(
      "You cannot change your own account status",
      403
    );
  }

  const existing = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId,
      role: { in: managedRoles }
    },
    select: { id: true, isActive: true }
  });

  if (!existing) {
    throw new UserManagementError("User not found", 404);
  }

  return prisma.$transaction(async tx => {
    const user = await tx.user.update({
      where: { id: existing.id },
      data: { isActive },
      select: publicUserSelect
    });

    if (!isActive) {
      await tx.refreshToken.updateMany({
        where: { userId: existing.id, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }

    return user;
  });
}
