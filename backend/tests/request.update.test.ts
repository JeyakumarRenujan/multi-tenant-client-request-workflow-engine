import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();
const unique = Date.now();
const password = "UpdateTestPassword!123";

let organizationAId: string;
let organizationBId: string;
let clientAId: string;
let clientBId: string;
let managerAId: string;
let clientUserAId: string;
let developerAId: string;
let developerBId: string;

let managerToken: string;
let clientToken: string;

let editableRequestId: string;
let assignableRequestId: string;
let crossTenantRequestId: string;

async function createUser(
  name: string,
  role: "MANAGER" | "CLIENT_USER" | "DEVELOPER",
  organizationId: string,
  clientId?: string
) {
  return prisma.user.create({
    data: {
      name,
      email: `update-${name.toLowerCase().replace(/\s/g, "-")}-${unique}@example.test`,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      organizationId,
      clientId: clientId ?? null
    }
  });
}

async function login(email: string) {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });

  assert.equal(response.status, 200);
  return response.body.data.accessToken as string;
}

before(async () => {
  const [orgA, orgB] = await Promise.all([
    prisma.organization.create({
      data: {
        name: "Update Test Organization A",
        slug: `update-test-a-${unique}`
      }
    }),
    prisma.organization.create({
      data: {
        name: "Update Test Organization B",
        slug: `update-test-b-${unique}`
      }
    })
  ]);

  organizationAId = orgA.id;
  organizationBId = orgB.id;

  const [clientA, clientB] = await Promise.all([
    prisma.client.create({
      data: { name: "Update Test Client A", organizationId: organizationAId }
    }),
    prisma.client.create({
      data: { name: "Update Test Client B", organizationId: organizationBId }
    })
  ]);

  clientAId = clientA.id;
  clientBId = clientB.id;

  const [manager, clientUser, developerA, developerB] = await Promise.all([
    createUser("Manager A", "MANAGER", organizationAId),
    createUser("Client User A", "CLIENT_USER", organizationAId, clientAId),
    createUser("Developer A", "DEVELOPER", organizationAId),
    createUser("Developer B", "DEVELOPER", organizationBId)
  ]);

  managerAId = manager.id;
  clientUserAId = clientUser.id;
  developerAId = developerA.id;
  developerBId = developerB.id;

  [managerToken, clientToken] = await Promise.all([
    login(manager.email),
    login(clientUser.email)
  ]);

  const [editable, assignable, crossTenant] = await Promise.all([
    prisma.request.create({
      data: {
        organizationId: organizationAId,
        clientId: clientAId,
        createdById: clientUserAId,
        title: "Original request title",
        description: "Original description",
        category: "FEATURE",
        priority: "MEDIUM"
      }
    }),
    prisma.request.create({
      data: {
        organizationId: organizationAId,
        clientId: clientAId,
        createdById: clientUserAId,
        title: "Request to assign",
        description: "Assignment test",
        category: "BUG",
        priority: "HIGH"
      }
    }),
    prisma.request.create({
      data: {
        organizationId: organizationBId,
        clientId: clientBId,
        createdById: (await createUser(
          "Client User B",
          "CLIENT_USER",
          organizationBId,
          clientBId
        )).id,
        title: "Private organization B request",
        description: "Cross tenant test",
        category: "FEATURE",
        priority: "LOW"
      }
    })
  ]);

  editableRequestId = editable.id;
  assignableRequestId = assignable.id;
  crossTenantRequestId = crossTenant.id;
});

after(async () => {
  const organizationIds = [organizationAId, organizationBId].filter(Boolean);

  if (organizationIds.length) {
    await prisma.activityHistory.deleteMany({
      where: { organizationId: { in: organizationIds } }
    });

    await prisma.request.deleteMany({
      where: { organizationId: { in: organizationIds } }
    });
  }

  const users = await prisma.user.findMany({
    where: {
      organizationId: { in: organizationIds }
    },
    select: { id: true }
  });

  const userIds = users.map((user) => user.id);

  if (userIds.length) {
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: userIds } }
    });

    await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });
  }

  const clientIds = [clientAId, clientBId].filter(Boolean);

  if (clientIds.length) {
    await prisma.client.deleteMany({
      where: { id: { in: clientIds } }
    });
  }

  if (organizationIds.length) {
    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } }
    });
  }

  await prisma.$disconnect();
});

test("Request update and assignment API tests", async (t) => {
  await t.test("Manager updates request details successfully", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${editableRequestId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        version: 1,
        title: "Updated request title",
        priority: "HIGH"
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.request.title, "Updated request title");
    assert.equal(response.body.data.request.priority, "HIGH");
    assert.equal(response.body.data.request.version, 2);
  });

  await t.test("update creates an activity history record", async () => {
    const history = await prisma.activityHistory.findFirst({
      where: {
        requestId: editableRequestId,
        event: "REQUEST_UPDATED"
      }
    });

    assert.ok(history);
    assert.equal(history?.actorId, managerAId);
  });

  await t.test("rejects an update with a stale version", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${editableRequestId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        version: 1,
        title: "Stale update"
      });

    assert.equal(response.status, 409);

    const stored = await prisma.request.findUniqueOrThrow({
      where: { id: editableRequestId }
    });

    assert.equal(stored.title, "Updated request title");
    assert.equal(stored.version, 2);
  });

  await t.test("rejects a Client User attempting to update", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${editableRequestId}`)
      .set("Authorization", `Bearer ${clientToken}`)
      .send({
        version: 2,
        title: "Unauthorized update"
      });

    assert.equal(response.status, 403);
  });

  await t.test("rejects frontend-supplied protected fields", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${editableRequestId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        version: 2,
        title: "Invalid update",
        organizationId: organizationBId,
        status: "APPROVED"
      });

    assert.equal(response.status, 400);
  });

  await t.test("rejects an empty update", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${editableRequestId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ version: 2 });

    assert.equal(response.status, 400);
  });

  await t.test("Manager assigns a Developer in the same organization", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${assignableRequestId}/assignment`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        version: 1,
        assignedToId: developerAId
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.request.assignedToId, developerAId);
    assert.equal(response.body.data.request.version, 2);
  });

  await t.test("assignment creates an activity history record", async () => {
    const history = await prisma.activityHistory.findFirst({
      where: {
        requestId: assignableRequestId,
        event: "REQUEST_ASSIGNED"
      }
    });

    assert.ok(history);
    assert.equal(history?.actorId, managerAId);
  });

  await t.test("rejects assignment to a Developer from another organization", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${assignableRequestId}/assignment`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        version: 2,
        assignedToId: developerBId
      });

    assert.equal(response.status, 400);
  });

  await t.test("rejects assignment with a stale version", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${assignableRequestId}/assignment`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        version: 1,
        assignedToId: null
      });

    assert.equal(response.status, 409);
  });

  await t.test("Manager can unassign a Developer", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${assignableRequestId}/assignment`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        version: 2,
        assignedToId: null
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.request.assignedToId, null);
    assert.equal(response.body.data.request.version, 3);
  });

  await t.test("rejects updates to another organization's request", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${crossTenantRequestId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        version: 1,
        title: "Cross tenant attack"
      });

    assert.equal(response.status, 404);
  });

  await t.test("requires authentication for updates", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${editableRequestId}`)
      .send({
        version: 2,
        title: "Unauthenticated update"
      });

    assert.equal(response.status, 401);
  });
  await t.test("only one of two simultaneous updates using the same version succeeds", async () => {
    const concurrencyRequest = await prisma.request.create({
      data: {
        organizationId: organizationAId,
        clientId: clientAId,
        createdById: clientUserAId,
        title: "Concurrency test request",
        description: "Testing simultaneous updates",
        category: "FEATURE",
        priority: "MEDIUM"
      }
    });

    const responses = await Promise.all([
      request(app)
        .patch(`/api/v1/requests/${concurrencyRequest.id}`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          version: 1,
          title: "Concurrent update A"
        }),
      request(app)
        .patch(`/api/v1/requests/${concurrencyRequest.id}`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          version: 1,
          title: "Concurrent update B"
        })
    ]);

    const statuses = responses.map((response) => response.status).sort();

    assert.deepEqual(statuses, [200, 409]);

    const stored = await prisma.request.findUniqueOrThrow({
      where: { id: concurrencyRequest.id }
    });

    assert.equal(stored.version, 2);
    assert.ok(
      ["Concurrent update A", "Concurrent update B"].includes(stored.title)
    );

    const historyCount = await prisma.activityHistory.count({
      where: {
        requestId: concurrencyRequest.id,
        event: "REQUEST_UPDATED"
      }
    });

    assert.equal(historyCount, 1);
  });
});