import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();
const unique = Date.now();
const password = "ReadTestPassword!123";

let organizationAId: string;
let organizationBId: string;
let clientAId: string;
let clientA2Id: string;
let clientBId: string;

let clientAUserId: string;
let clientA2UserId: string;
let clientBUserId: string;
let managerAId: string;
let developerAId: string;

let clientAToken: string;
let clientA2Token: string;
let clientBToken: string;
let managerAToken: string;
let developerAToken: string;

let requestA1Id: string;
let requestA2Id: string;
let requestA3Id: string;
let requestB1Id: string;

const email = (role: string) =>
  `read-${role}-${unique}@example.test`.toLowerCase();

async function createUser(
  name: string,
  role: "CLIENT_USER" | "MANAGER" | "DEVELOPER",
  organizationId: string,
  clientId?: string
) {
  return prisma.user.create({
    data: {
      name,
      email: email(name.replace(/\s/g, "-")),
      passwordHash: await bcrypt.hash(password, 12),
      role,
      organizationId,
      clientId: clientId ?? null
    }
  });
}

async function login(userEmail: string) {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: userEmail, password });

  assert.equal(response.status, 200);
  return response.body.data.accessToken as string;
}

async function createTestRequest(
  organizationId: string,
  clientId: string,
  createdById: string,
  title: string,
  options: {
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    category?: "FEATURE" | "BUG" | "CHANGE_REQUEST" | "OTHER";
    status?: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" |
      "APPROVED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED";
    assignedToId?: string;
  } = {}
) {
  return prisma.request.create({
    data: {
      organizationId,
      clientId,
      createdById,
      title,
      description: `Description for ${title}`,
      category: options.category ?? "FEATURE",
      priority: options.priority ?? "MEDIUM",
      status: options.status ?? "DRAFT",
      assignedToId: options.assignedToId ?? null
    }
  });
}

before(async () => {
  const organizationA = await prisma.organization.create({
    data: {
      name: "Read Test Organization A",
      slug: `read-test-a-${unique}`
    }
  });

  const organizationB = await prisma.organization.create({
    data: {
      name: "Read Test Organization B",
      slug: `read-test-b-${unique}`
    }
  });

  organizationAId = organizationA.id;
  organizationBId = organizationB.id;

  const [clientA, clientA2, clientB] = await Promise.all([
    prisma.client.create({
      data: { name: "Read Test Client A", organizationId: organizationAId }
    }),
    prisma.client.create({
      data: { name: "Read Test Client A2", organizationId: organizationAId }
    }),
    prisma.client.create({
      data: { name: "Read Test Client B", organizationId: organizationBId }
    })
  ]);

  clientAId = clientA.id;
  clientA2Id = clientA2.id;
  clientBId = clientB.id;

  const [
    clientAUser,
    clientA2User,
    clientBUser,
    managerA,
    developerA
  ] = await Promise.all([
    createUser("Client A User", "CLIENT_USER", organizationAId, clientAId),
    createUser("Client A2 User", "CLIENT_USER", organizationAId, clientA2Id),
    createUser("Client B User", "CLIENT_USER", organizationBId, clientBId),
    createUser("Manager A", "MANAGER", organizationAId),
    createUser("Developer A", "DEVELOPER", organizationAId)
  ]);

  clientAUserId = clientAUser.id;
  clientA2UserId = clientA2User.id;
  clientBUserId = clientBUser.id;
  managerAId = managerA.id;
  developerAId = developerA.id;

  [clientAToken, clientA2Token, clientBToken, managerAToken, developerAToken] =
    await Promise.all([
      login(clientAUser.email),
      login(clientA2User.email),
      login(clientBUser.email),
      login(managerA.email),
      login(developerA.email)
    ]);

  const [requestA1, requestA2, requestA3, requestB1] = await Promise.all([
    createTestRequest(
      organizationAId, clientAId, clientAUserId,
      "Assigned high-priority feature",
      { priority: "HIGH", assignedToId: developerAId }
    ),
    createTestRequest(
      organizationAId, clientA2Id, clientA2UserId,
      "Other client bug",
      { category: "BUG", priority: "LOW" }
    ),
    createTestRequest(
      organizationAId, clientAId, clientAUserId,
      "Unassigned change request",
      { category: "CHANGE_REQUEST", status: "SUBMITTED" }
    ),
    createTestRequest(
      organizationBId, clientBId, clientBUserId,
      "Organization B private request"
    )
  ]);

  requestA1Id = requestA1.id;
  requestA2Id = requestA2.id;
  requestA3Id = requestA3.id;
  requestB1Id = requestB1.id;
});

after(async () => {
  const organizationIds = [organizationAId, organizationBId].filter(Boolean);
  const userIds = [
    clientAUserId,
    clientA2UserId,
    clientBUserId,
    managerAId,
    developerAId
  ].filter(Boolean);

  if (organizationIds.length) {
    await prisma.activityHistory.deleteMany({
      where: { organizationId: { in: organizationIds } }
    });

    await prisma.request.deleteMany({
      where: { organizationId: { in: organizationIds } }
    });
  }

  if (userIds.length) {
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: userIds } }
    });

    await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });
  }

  const clientIds = [clientAId, clientA2Id, clientBId].filter(Boolean);

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

test("Request listing and retrieval API tests", async (t) => {
  await t.test("requires authentication to list requests", async () => {
    const response = await request(app).get("/api/v1/requests");

    assert.equal(response.status, 401);
  });

  await t.test("Manager sees requests in their organization only", async () => {
    const response = await request(app)
      .get("/api/v1/requests")
      .set("Authorization", `Bearer ${managerAToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.pagination.total, 3);

    const ids = response.body.data.requests.map(
      (item: { id: string }) => item.id
    );

    assert.ok(ids.includes(requestA1Id));
    assert.ok(ids.includes(requestA2Id));
    assert.ok(ids.includes(requestA3Id));
    assert.ok(!ids.includes(requestB1Id));
  });

  await t.test("Client User sees only their own client's requests", async () => {
    const response = await request(app)
      .get("/api/v1/requests")
      .set("Authorization", `Bearer ${clientAToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.pagination.total, 2);

    for (const item of response.body.data.requests) {
      assert.equal(item.clientId, clientAId);
    }
  });

  await t.test("Developer sees only requests assigned to them", async () => {
    const response = await request(app)
      .get("/api/v1/requests")
      .set("Authorization", `Bearer ${developerAToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.pagination.total, 1);
    assert.equal(response.body.data.requests[0].id, requestA1Id);
  });

  await t.test("filters requests by status, priority and category", async () => {
    const response = await request(app)
      .get("/api/v1/requests?status=SUBMITTED&category=CHANGE_REQUEST")
      .set("Authorization", `Bearer ${managerAToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.pagination.total, 1);
    assert.equal(response.body.data.requests[0].id, requestA3Id);
  });

  await t.test("supports pagination", async () => {
    const response = await request(app)
      .get("/api/v1/requests?page=1&limit=2")
      .set("Authorization", `Bearer ${managerAToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.requests.length, 2);
    assert.equal(response.body.data.pagination.page, 1);
    assert.equal(response.body.data.pagination.limit, 2);
    assert.equal(response.body.data.pagination.total, 3);
    assert.equal(response.body.data.pagination.totalPages, 2);
  });

  await t.test("rejects invalid filters", async () => {
    const response = await request(app)
      .get("/api/v1/requests?page=0&limit=500&status=UNKNOWN")
      .set("Authorization", `Bearer ${managerAToken}`);

    assert.equal(response.status, 400);
  });

  await t.test("rejects access to another organization request", async () => {
    const response = await request(app)
      .get(`/api/v1/requests/${requestB1Id}`)
      .set("Authorization", `Bearer ${managerAToken}`);

    assert.equal(response.status, 404);
  });

  await t.test("Client User cannot retrieve another client's request", async () => {
    const response = await request(app)
      .get(`/api/v1/requests/${requestA2Id}`)
      .set("Authorization", `Bearer ${clientAToken}`);

    assert.equal(response.status, 404);
  });

  await t.test("Developer cannot retrieve an unassigned request", async () => {
    const response = await request(app)
      .get(`/api/v1/requests/${requestA3Id}`)
      .set("Authorization", `Bearer ${developerAToken}`);

    assert.equal(response.status, 404);
  });

  await t.test("authorized Manager retrieves a request", async () => {
    const response = await request(app)
      .get(`/api/v1/requests/${requestA1Id}`)
      .set("Authorization", `Bearer ${managerAToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.request.id, requestA1Id);
  });

  await t.test("rejects an invalid request ID", async () => {
    const response = await request(app)
      .get("/api/v1/requests/not-a-uuid")
      .set("Authorization", `Bearer ${managerAToken}`);

    assert.equal(response.status, 400);
  });

  await t.test("Client User in another organization sees only their client", async () => {
    const response = await request(app)
      .get("/api/v1/requests")
      .set("Authorization", `Bearer ${clientBToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.pagination.total, 1);
    assert.equal(response.body.data.requests[0].id, requestB1Id);
  });

  await t.test("Client User from another client cannot access this client's request", async () => {
    const response = await request(app)
      .get(`/api/v1/requests/${requestA1Id}`)
      .set("Authorization", `Bearer ${clientA2Token}`);

    assert.equal(response.status, 404);
  });
});