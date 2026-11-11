import { prisma } from "../../lib/prisma";
import { ListClientsInput } from "./client.validation";
import { UserManagementError } from "./user.service";

type ClientActor = {
  organizationId: string | null;
};

export async function listClients(
  filters: ListClientsInput,
  actor: ClientActor
) {
  if (!actor.organizationId) {
    throw new UserManagementError("Your account is not associated with an organization", 403);
  }

  const where = {
    organizationId: actor.organizationId
  };

  const skip = (filters.page - 1) * filters.limit;

  const [clients, total] = await prisma.$transaction([
    prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        contactEmail: true
      },
      orderBy: { name: "asc" },
      skip,
      take: filters.limit
    }),
    prisma.client.count({ where })
  ]);

  return {
    clients,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit)
    }
  };
}

