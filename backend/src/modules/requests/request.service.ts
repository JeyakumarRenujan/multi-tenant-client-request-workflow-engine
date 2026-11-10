import {
  RequestPriority,
  RequestStatus,
  UserRole,
  Prisma
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  CreateRequestInput,
  ListRequestsInput,
  UpdateRequestInput,
  AssignRequestInput
} from "./request.validation";

export class RequestError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "RequestError";
  }
}

export type RequestActor = {
  id: string;
  role: string;
  organizationId: string | null;
  clientId: string | null;
};

const requestSelect = {
  id: true,
  organizationId: true,
  clientId: true,
  createdById: true,
  assignedToId: true,
  title: true,
  description: true,
  category: true,
  priority: true,
  status: true,
  dueDate: true,
  rejectionReason: true,
  version: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.RequestSelect;

function buildVisibilityFilter(
  actor: RequestActor
): Prisma.RequestWhereInput {
  if (actor.role === UserRole.PLATFORM_ADMIN) {
    throw new RequestError(
      "Platform administrators do not have automatic access to tenant requests",
      403
    );
  }

  if (!actor.organizationId) {
    throw new RequestError(
      "Your account is not associated with an organization",
      403
    );
  }

  const where: Prisma.RequestWhereInput = {
    organizationId: actor.organizationId,
    deletedAt: null
  };

  if (actor.role === UserRole.CLIENT_USER) {
    if (!actor.clientId) {
      throw new RequestError(
        "Your account is not associated with a client",
        403
      );
    }

    where.clientId = actor.clientId;
    return where;
  }

  if (actor.role === UserRole.DEVELOPER) {
    where.assignedToId = actor.id;
    return where;
  }

  if (
    actor.role === UserRole.ORGANIZATION_ADMIN ||
    actor.role === UserRole.MANAGER
  ) {
    return where;
  }

  throw new RequestError("Access denied", 403);
}

function requireManager(actor: RequestActor) {
  if (actor.role !== UserRole.MANAGER) {
    throw new RequestError(
      "Only managers can update or assign requests",
      403
    );
  }

  if (!actor.organizationId) {
    throw new RequestError(
      "Your account is not associated with an organization",
      403
    );
  }
}

async function findManagerRequest(
  tx: Prisma.TransactionClient,
  requestId: string,
  actor: RequestActor
) {
  const existing = await tx.request.findFirst({
    where: {
      id: requestId,
      organizationId: actor.organizationId!,
      deletedAt: null
    },
    select: requestSelect
  });

  if (!existing) {
    throw new RequestError("Request not found", 404);
  }

  return existing;
}

export async function createRequest(
  input: CreateRequestInput,
  actor: RequestActor
) {
  if (actor.role !== UserRole.CLIENT_USER) {
    throw new RequestError(
      "Only client users can create requests",
      403
    );
  }

  if (!actor.organizationId || !actor.clientId) {
    throw new RequestError(
      "Your account is not associated with a valid organization and client",
      403
    );
  }

  const organizationId = actor.organizationId;
  const clientId = actor.clientId;
  const createdById = actor.id;

  return prisma.$transaction(async (tx) => {
    const createdRequest = await tx.request.create({
      data: {
        organizationId,
        clientId,
        createdById,
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority ?? RequestPriority.MEDIUM,
        status: RequestStatus.DRAFT,
        dueDate: input.dueDate
          ? new Date(input.dueDate)
          : null
      },
      select: requestSelect
    });

    await tx.activityHistory.create({
      data: {
        organizationId,
        requestId: createdRequest.id,
        actorId: createdById,
        event: "REQUEST_CREATED",
        newStatus: RequestStatus.DRAFT,
        metadata: {
          title: createdRequest.title,
          category: createdRequest.category,
          priority: createdRequest.priority
        }
      }
    });

    return createdRequest;
  });
}

export async function listRequests(
  actor: RequestActor,
  filters: ListRequestsInput
) {
  const where: Prisma.RequestWhereInput = {
    ...buildVisibilityFilter(actor),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.category ? { category: filters.category } : {})
  };

  const skip = (filters.page - 1) * filters.limit;

  const [requests, total] = await prisma.$transaction([
    prisma.request.findMany({
      where,
      select: requestSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: filters.limit
    }),
    prisma.request.count({ where })
  ]);

  return {
    requests,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit)
    }
  };
}

export async function getRequestById(
  requestId: string,
  actor: RequestActor
) {
  const where = buildVisibilityFilter(actor);

  const foundRequest = await prisma.request.findFirst({
    where: {
      ...where,
      id: requestId
    },
    select: requestSelect
  });

  if (!foundRequest) {
    throw new RequestError("Request not found", 404);
  }

  return foundRequest;
}

export async function updateRequest(
  requestId: string,
  input: UpdateRequestInput,
  actor: RequestActor
) {
  requireManager(actor);

  return prisma.$transaction(async (tx) => {
    const existing = await findManagerRequest(tx, requestId, actor);

    if (existing.version !== input.version) {
      throw new RequestError(
        "Request was modified by another user. Please refresh and try again.",
        409
      );
    }

    const { version, dueDate, ...fields } = input;

    const data: Prisma.RequestUpdateManyMutationInput = {
      ...fields,
      ...(dueDate !== undefined
        ? { dueDate: dueDate === null ? null : new Date(dueDate) }
        : {}),
      version: { increment: 1 }
    };

    const result = await tx.request.updateMany({
      where: {
        id: requestId,
        organizationId: actor.organizationId!,
        version,
        deletedAt: null
      },
      data
    });

    if (result.count !== 1) {
      throw new RequestError(
        "Request was modified by another user. Please refresh and try again.",
        409
      );
    }

    const updatedRequest = await tx.request.findFirstOrThrow({
      where: {
        id: requestId,
        organizationId: actor.organizationId!
      },
      select: requestSelect
    });

    await tx.activityHistory.create({
      data: {
        organizationId: actor.organizationId!,
        requestId,
        actorId: actor.id,
        event: "REQUEST_UPDATED",
        metadata: {
          previousVersion: existing.version,
          newVersion: updatedRequest.version,
          changes: fields,
          dueDate: dueDate === undefined
            ? "UNCHANGED"
            : dueDate
        }
      }
    });

    return updatedRequest;
  });
}

export async function assignRequest(
  requestId: string,
  input: AssignRequestInput,
  actor: RequestActor
) {
  requireManager(actor);

  return prisma.$transaction(async (tx) => {
    const existing = await findManagerRequest(tx, requestId, actor);

    if (existing.version !== input.version) {
      throw new RequestError(
        "Request was modified by another user. Please refresh and try again.",
        409
      );
    }

    if (input.assignedToId !== null) {
      const developer = await tx.user.findFirst({
        where: {
          id: input.assignedToId,
          organizationId: actor.organizationId!,
          role: UserRole.DEVELOPER,
          isActive: true
        },
        select: { id: true }
      });

      if (!developer) {
        throw new RequestError(
          "The selected developer is invalid or unavailable",
          400
        );
      }
    }

    const result = await tx.request.updateMany({
      where: {
        id: requestId,
        organizationId: actor.organizationId!,
        version: input.version,
        deletedAt: null
      },
      data: {
        assignedToId: input.assignedToId,
        version: { increment: 1 }
      }
    });

    if (result.count !== 1) {
      throw new RequestError(
        "Request was modified by another user. Please refresh and try again.",
        409
      );
    }

    const updatedRequest = await tx.request.findFirstOrThrow({
      where: {
        id: requestId,
        organizationId: actor.organizationId!
      },
      select: requestSelect
    });

    await tx.activityHistory.create({
      data: {
        organizationId: actor.organizationId!,
        requestId,
        actorId: actor.id,
        event: input.assignedToId === null
          ? "REQUEST_UNASSIGNED"
          : "REQUEST_ASSIGNED",
        metadata: {
          previousAssigneeId: existing.assignedToId,
          newAssigneeId: input.assignedToId,
          previousVersion: existing.version,
          newVersion: updatedRequest.version
        }
      }
    });

    return updatedRequest;
  });
}