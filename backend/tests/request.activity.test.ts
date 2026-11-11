import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();
const unique = Date.now();
const password = "ActivityTestPassword!123";

let organizationAId: string;
let organizationBId: string;
let clientAId: string;
let clientBId: string;

let managerId: string;
let clientUserAId: string;
let clientUserBId: string;
let developerAId: string;
let developerBId: string;

let managerToken: string;
let clientToken: string;
let developerToken: string;

let ownRequestId: string;
let otherClientRequestId: string;
let unassignedRequestId: string;

async function createUser(
  name: string,
  role: "MANAGER" | "CLIENT_USER" | "DEVELOPER",
  organizationId: string,
  clientId?: string,
  isActive = true
) {
  return prisma.user.create({
    data: {
      name,
      email: `activity-${name.toLowerCase().replace(/\s/g, "-")}-${unique}@example.test`,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      organizationId,
      clientId: clientId ?? null,
      isActive
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
        name: "Activity Test Organization A",
        slug: `activity-test-a-${unique}`
      }
    }),
    prisma.organization.create({
      data: {
        name: "Activity Test Organization B",
        slug: `activity-test-b-${unique}`
      }
    })
  ]);

  organizationAId = orgA.id;
  organizationBId = orgB.id;

  const [clientA, clientB] = await Promise.all([
    prisma.client.create({
      data: {
        name: "Activity Test Client A",
        organizationId: organizationAId
      }
    }),
    prisma.client.create({
      data: {
        name: "Activity Test Client B",
        organizationId: organizationAId
      }
    })
  ]);

  clientAId = clientA.id;
  clientBId = clientB.id;

  const [
    manager,
    clientUserA,
    clientUserB,
    developerA,
    inactiveDeveloper,
    developerB
  ] = await Promise.all([
    createUser("Manager A", "MANAGER", organizationAId),
    createUser("Client User A", "CLIENT_USER", organizationAId, clientAId),
    createUser("Client User B", "CLIENT_USER", organizationAId, clientBId),
    createUser("Developer A", "DEVELOPER", organizationAId),
    createUser("Inactive Developer", "DEVELOPER", organizationAId, undefined, false),
    createUser("Developer B", "DEVELOPER", organizationBId)
  ]);

  managerId = manager.id;
  clientUserAId = clientUserA.id;
  clientUserBId = clientUserB.id;
  developerAId = developerA.id;
  developerBId = developerB.id;
  developerBId = developerB.id;

  [managerToken, clientToken, developerToken] = await Promise.all([
    login(manager.email),
    login(clientUserA.email),
    login(developerA.email)
  ]);

  const [ownRequest, otherClientRequest, unassignedRequest] =
    await Promise.all([
      prisma.request.create({
        data: {
          organizationId: organizationAId,
          clientId: clientAId,
          createdById: clientUserAId,
          assignedToId: developerAId,
          title: "Activity test assigned request",
          description: "Assigned request for activity testing",
          category: "FEATURE",
          priority: "MEDIUM"
        }
      }),
      prisma.request.create({
        data: {
          organizationId: organizationAId,
          clientId: clientBId,
          createdById: clientUserBId,
          title: "Other client request",
          description: "Request belonging to another client",
          category: "BUG",
          priority: "LOW"
        }
      }),
      prisma.request.create({
        data: {
          organizationId: organizationAId,
          clientId: clientAId,
          createdById: clientUserAId,
          title: "Unassigned request",
          description: "Not assigned to Developer A",
          category: "FEATURE",
          priority: "LOW"
        }
      })
    ]);

  ownRequestId = ownRequest.id;
  otherClientRequestId = otherClientRequest.id;
  unassignedRequestId = unassignedRequest.id;

  await prisma.activityHistory.create({
    data: {
      organizationId: organizationAId,
      requestId: ownRequestId,
      actorId: managerId,
      event: "REQUEST_ASSIGNED",
      metadata: { assignedToId: developerAId }
    }
  });
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

    const users = await prisma.user.findMany({
      where: { organizationId: { in: organizationIds } },
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

    await prisma.client.deleteMany({
      where: { organizationId: { in: organizationIds } }
    });

    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } }
    });
  }

  await prisma.$disconnect();
});

test("Request assignees and activity history API tests", async (t) => {
  await t.test("Manager retrieves only active Developers from their organization", async () => {
    const response = await request(app)
      .get("/api/v1/requests/assignees")
      .set("Authorization", `Bearer ${managerToken}`);

    assert.equal(response.status, 200);

    const developers = response.body.data.developers;

    assert.ok(developers.some(
      (developer: { id: string }) => developer.id === developerAId
    ));

    assert.ok(developers.every(
      (developer: { id: string }) => developer.id !== developerBId
    ));

    assert.ok(developers.every(
      (developer: { name: string }) => developer.name !== "Inactive Developer"
    ));
  });

  await t.test("Client User cannot access the assignees endpoint", async () => {
    const response = await request(app)
      .get("/api/v1/requests/assignees")
      .set("Authorization", `Bearer ${clientToken}`);

    assert.equal(response.status, 403);
  });

  await t.test("Manager retrieves request activity with actor details", async () => {
    const response = await request(app)
      .get(`/api/v1/requests/${ownRequestId}/activity`)
      .set("Authorization", `Bearer ${managerToken}`);

    assert.equal(response.status, 200);

    const activities = response.body.data.activities;

    assert.equal(activities.length, 1);
    assert.equal(activities[0].event, "REQUEST_ASSIGNED");
    assert.equal(activities[0].actor.id, managerId);
    assert.equal(activities[0].actor.name, "Manager A");
    assert.equal(activities[0].actor.role, "MANAGER");
  });

  await t.test("Client User can retrieve activity for their own client request", async () => {
    const response = await request(app)
      .get(`/api/v1/requests/${ownRequestId}/activity`)
      .set("Authorization", `Bearer ${clientToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.activities.length, 1);
  });

  await t.test("Client User cannot retrieve another client's activity", async () => {
    const response = await request(app)
      .get(`/api/v1/requests/${otherClientRequestId}/activity`)
      .set("Authorization", `Bearer ${clientToken}`);

    assert.equal(response.status, 404);
  });

  await t.test("Assigned Developer can retrieve request activity", async () => {
    const response = await request(app)
      .get(`/api/v1/requests/${ownRequestId}/activity`)
      .set("Authorization", `Bearer ${developerToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.activities.length, 1);
  });

  await t.test("Developer cannot retrieve activity for an unassigned request", async () => {
    const response = await request(app)
      .get(`/api/v1/requests/${unassignedRequestId}/activity`)
      .set("Authorization", `Bearer ${developerToken}`);

    assert.equal(response.status, 404);
  });

  await t.test("Activity endpoint requires authentication", async () => {
    const response = await request(app)
      .get(`/api/v1/requests/${ownRequestId}/activity`);

    assert.equal(response.status, 401);
  });
});