import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import request from "supertest";
import { PrismaClient, UserRole } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();
const unique = Date.now();
const password = "DashboardTestPassword!123";

let organizationAId: string;
let organizationBId: string;
let clientA1Id: string;
let clientA2Id: string;

let managerAToken: string;
let adminAToken: string;
let developerAToken: string;
let clientA1Token: string;
let clientA2Token: string;
let managerBToken: string;
let clientBToken: string;
let platformAdminToken: string;

const email = (name: string) =>
  `dashboard-${name}-${unique}@example.test`.toLowerCase();

async function createUser(
  name: string,
  role: UserRole,
  organizationId: string | null,
  clientId: string | null = null
) {
  return prisma.user.create({
    data: {
      name,
      email: email(name),
      passwordHash: await bcrypt.hash(password, 12),
      role,
      organizationId,
      clientId
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
  options: {
    status?: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" |
      "APPROVED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED";
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    dueDate?: Date;
    assignedToId?: string | null;
    rejectionReason?: string;
  } = {}
) {
  return prisma.request.create({
    data: {
      organizationId,
      clientId,
      createdById,
      title: `Dashboard test ${unique} ${Math.random()}`,
      description: "Dashboard integration test request",
      category: "FEATURE",
      status: options.status ?? "DRAFT",
      priority: options.priority ?? "MEDIUM",
      dueDate: options.dueDate ?? null,
      assignedToId: options.assignedToId ?? null,
      rejectionReason: options.rejectionReason ?? null
    }
  });
}

before(async () => {
  const [organizationA, organizationB] = await Promise.all([
    prisma.organization.create({
      data: {
        name: "Dashboard Test Organization A",
        slug: `dashboard-test-a-${unique}`
      }
    }),
    prisma.organization.create({
      data: {
        name: "Dashboard Test Organization B",
        slug: `dashboard-test-b-${unique}`
      }
    })
  ]);

  organizationAId = organizationA.id;
  organizationBId = organizationB.id;

  const [clientA1, clientA2, clientB] = await Promise.all([
    prisma.client.create({
      data: {
        name: "Dashboard Client A1",
        organizationId: organizationAId
      }
    }),
    prisma.client.create({
      data: {
        name: "Dashboard Client A2",
        organizationId: organizationAId
      }
    }),
    prisma.client.create({
      data: {
        name: "Dashboard Client B",
        organizationId: organizationBId
      }
    })
  ]);

  clientA1Id = clientA1.id;
  clientA2Id = clientA2.id;

  const users = await Promise.all([
    createUser("manager-a", UserRole.MANAGER, organizationAId),
    createUser("admin-a", UserRole.ORGANIZATION_ADMIN, organizationAId),
    createUser("developer-a", UserRole.DEVELOPER, organizationAId),
    createUser("client-a1", UserRole.CLIENT_USER, organizationAId, clientA1.id),
    createUser("client-a2", UserRole.CLIENT_USER, organizationAId, clientA2.id),
    createUser("manager-b", UserRole.MANAGER, organizationBId),
    createUser("client-b", UserRole.CLIENT_USER, organizationBId, clientB.id),
    createUser("platform-admin", UserRole.PLATFORM_ADMIN, null)
  ]);

  const [
    managerA,
    adminA,
    developerA,
    clientA1User,
    clientA2User,
    managerB,
    clientBUser,
    platformAdmin
  ] = users;

  [
    managerAToken,
    adminAToken,
    developerAToken,
    clientA1Token,
    clientA2Token,
    managerBToken,
    clientBToken,
    platformAdminToken
  ] = await Promise.all(users.map((user) => login(user.email)));

  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await Promise.all([
    createTestRequest(
      organizationAId, clientA1Id, clientA1User.id,
      {
        status: "DRAFT",
        priority: "HIGH",
        dueDate: past,
        assignedToId: developerA.id
      }
    ),
    createTestRequest(
      organizationAId, clientA1Id, clientA1User.id,
      {
        status: "SUBMITTED",
        priority: "MEDIUM",
        dueDate: past
      }
    ),
    createTestRequest(
      organizationAId, clientA1Id, clientA1User.id,
      {
        status: "COMPLETED",
        priority: "HIGH",
        dueDate: past
      }
    ),
    createTestRequest(
      organizationAId, clientA1Id, clientA1User.id,
      {
        status: "REJECTED",
        priority: "CRITICAL",
        dueDate: past,
        rejectionReason: "The requested feature is outside the project scope"
      }
    ),
    createTestRequest(
      organizationAId, clientA2Id, clientA2User.id,
      {
        status: "UNDER_REVIEW",
        priority: "LOW",
        dueDate: future
      }
    ),
    createTestRequest(
      organizationBId, clientBUser.clientId!, clientBUser.id,
      {
        status: "IN_PROGRESS",
        priority: "CRITICAL",
        dueDate: past
      }
    )
  ]);
});

after(async () => {
  const organizationIds = [organizationAId, organizationBId].filter(Boolean);

  await prisma.activityHistory.deleteMany({
    where: { organizationId: { in: organizationIds } }
  });

  await prisma.request.deleteMany({
    where: { organizationId: { in: organizationIds } }
  });

  await prisma.user.deleteMany({
    where: { organizationId: { in: organizationIds } }
  });

  await prisma.user.deleteMany({
    where: { email: email("platform-admin") }
  });

  await prisma.client.deleteMany({
    where: { organizationId: { in: organizationIds } }
  });

  await prisma.organization.deleteMany({
    where: { id: { in: organizationIds } }
  });

  await prisma.$disconnect();
});

test("requires authentication", async () => {
  const response = await request(app)
    .get("/api/v1/dashboard/summary");

  assert.equal(response.status, 401);
});

test("Manager sees organization-wide dashboard statistics", async () => {
  const response = await request(app)
    .get("/api/v1/dashboard/summary")
    .set("Authorization", `Bearer ${managerAToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.totalRequests, 5);
  assert.equal(response.body.data.overdueCount, 2);

  assert.deepEqual(response.body.data.statusCounts, {
    DRAFT: 1,
    SUBMITTED: 1,
    UNDER_REVIEW: 1,
    APPROVED: 0,
    REJECTED: 1,
    IN_PROGRESS: 0,
    COMPLETED: 1
  });

  assert.deepEqual(response.body.data.priorityCounts, {
    LOW: 1,
    MEDIUM: 1,
    HIGH: 2,
    CRITICAL: 1
  });

  assert.ok(response.body.data.generatedAt);
});

test("Organization Admin sees organization-wide statistics", async () => {
  const response = await request(app)
    .get("/api/v1/dashboard/summary")
    .set("Authorization", `Bearer ${adminAToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.totalRequests, 5);
});

test("Client User sees only their own client's statistics", async () => {
  const response = await request(app)
    .get("/api/v1/dashboard/summary")
    .set("Authorization", `Bearer ${clientA1Token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.totalRequests, 4);
  assert.equal(response.body.data.overdueCount, 2);
});

test("Client User cannot see another client's statistics", async () => {
  const response = await request(app)
    .get("/api/v1/dashboard/summary")
    .set("Authorization", `Bearer ${clientA2Token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.totalRequests, 1);
  assert.equal(response.body.data.overdueCount, 0);
});

test("Developer sees only assigned requests", async () => {
  const response = await request(app)
    .get("/api/v1/dashboard/summary")
    .set("Authorization", `Bearer ${developerAToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.totalRequests, 1);
  assert.equal(response.body.data.overdueCount, 1);
});

test("Organization B sees only its own statistics", async () => {
  const response = await request(app)
    .get("/api/v1/dashboard/summary")
    .set("Authorization", `Bearer ${managerBToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.totalRequests, 1);
  assert.equal(response.body.data.overdueCount, 1);
});

test("Organization B Client User sees only their client statistics", async () => {
  const response = await request(app)
    .get("/api/v1/dashboard/summary")
    .set("Authorization", `Bearer ${clientBToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.totalRequests, 1);
});

test("Platform Admin cannot access tenant dashboard statistics", async () => {
  const response = await request(app)
    .get("/api/v1/dashboard/summary")
    .set("Authorization", `Bearer ${platformAdminToken}`);

  assert.equal(response.status, 403);
});

test("frontend-supplied tenant IDs cannot change dashboard visibility", async () => {
  const response = await request(app)
    .get(`/api/v1/dashboard/summary?organizationId=${organizationBId}&clientId=${clientA2Id}`)
    .set("Authorization", `Bearer ${managerAToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.totalRequests, 5);
});

