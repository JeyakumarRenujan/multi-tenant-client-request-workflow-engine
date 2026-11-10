import {
  RequestPriority,
  RequestStatus,
  UserRole,
  Prisma
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  CreateRequestInput,
  ListRequestsInput
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
    const request = await tx.request.create({
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
        requestId: request.id,
        actorId: createdById,
        event: "REQUEST_CREATED",
        newStatus: RequestStatus.DRAFT,
        metadata: {
          title: request.title,
          category: request.category,
          priority: request.priority
        }
      }
    });

    return request;
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

  const request = await prisma.request.findFirst({
    where: {
      ...where,
      id: requestId
    },
    select: requestSelect
  });

  if (!request) {
    throw new RequestError("Request not found", 404);
  }

  return request;
}