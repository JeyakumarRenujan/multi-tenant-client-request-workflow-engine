import {
  RequestPriority,
  RequestStatus,
  UserRole
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { CreateRequestInput } from "./request.validation";

export class RequestError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "RequestError";
  }
}

type RequestActor = {
  id: string;
  role: string;
  organizationId: string | null;
  clientId: string | null;
};

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
      select: {
        id: true,
        organizationId: true,
        clientId: true,
        createdById: true,
        title: true,
        description: true,
        category: true,
        priority: true,
        status: true,
        dueDate: true,
        version: true,
        createdAt: true,
        updatedAt: true
      }
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