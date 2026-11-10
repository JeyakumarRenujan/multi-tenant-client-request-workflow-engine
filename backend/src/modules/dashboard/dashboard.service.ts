import {
  RequestPriority,
  RequestStatus,
  Prisma
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  buildVisibilityFilter,
  RequestActor
} from "../requests/request.service";

export async function getDashboardSummary(actor: RequestActor) {
  const where: Prisma.RequestWhereInput = buildVisibilityFilter(actor);
  const now = new Date();

  const overdueWhere: Prisma.RequestWhereInput = {
    ...where,
    dueDate: { lt: now },
    status: {
      notIn: [
        RequestStatus.COMPLETED,
        RequestStatus.REJECTED
      ]
    }
  };

  const [
    totalRequests,
    statusGroups,
    priorityGroups,
    overdueCount
  ] = await Promise.all([
    prisma.request.count({ where }),

    prisma.request.groupBy({
      by: ["status"],
      where,
      _count: { _all: true }
    }),

    prisma.request.groupBy({
      by: ["priority"],
      where,
      _count: { _all: true }
    }),

    prisma.request.count({
      where: overdueWhere
    })
  ]);

  const statusCounts: Record<RequestStatus, number> = {
    [RequestStatus.DRAFT]: 0,
    [RequestStatus.SUBMITTED]: 0,
    [RequestStatus.UNDER_REVIEW]: 0,
    [RequestStatus.APPROVED]: 0,
    [RequestStatus.REJECTED]: 0,
    [RequestStatus.IN_PROGRESS]: 0,
    [RequestStatus.COMPLETED]: 0
  };

  const priorityCounts: Record<RequestPriority, number> = {
    [RequestPriority.LOW]: 0,
    [RequestPriority.MEDIUM]: 0,
    [RequestPriority.HIGH]: 0,
    [RequestPriority.CRITICAL]: 0
  };

  for (const group of statusGroups) {
    statusCounts[group.status] = group._count._all;
  }

  for (const group of priorityGroups) {
    priorityCounts[group.priority] = group._count._all;
  }

  return {
    totalRequests,
    statusCounts,
    priorityCounts,
    overdueCount,
    generatedAt: now.toISOString()
  };
}
