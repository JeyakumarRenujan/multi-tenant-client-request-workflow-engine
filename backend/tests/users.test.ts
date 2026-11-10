import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();
const unique = Date.now();
const password = "UserManagementTest!123";

let organizationAId: string;
let organizationBId: string;
let clientAId: string;
let clientBId: string;
let adminAToken: string;
let adminBToken: string;
let managerToken: string;
let adminAId: string;
let managerId: string;
let createdUserId: string;

async function createUser(
  name: string,
  email: string,
  role: "ORGANIZATION_ADMIN" | "MANAGER",
  organizationId: string
) {
  return prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      organizationId
    }
  });
}

async function login(email: string) {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });

  assert.equal(
    response.status,
    200,
    `Login failed: ${JSON.stringify(response.body)}`
  );

  return response.body.data.accessToken as string;
}

before(async () => {
  const [orgA, orgB] = await Promise.all([
    prisma.organization.create({
      data: {
        name: "User Management Organization A",
        slug: `user-management-a-${unique}`
      }
    }),
    prisma.organization.create({
      data: {
        name: "User Management Organization B",
        slug: `user-management-b-${unique}`
      }
    })
  ]);

  organizationAId = orgA.id;
  organizationBId = orgB.id;

  const [clientA, clientB] = await Promise.all([
    prisma.client.create({
      data: {
        name: "User Management Client A",
        organizationId: organizationAId
      }
    }),
    prisma.client.create({
      data: {
        name: "User Management Client B",
        organizationId: organizationBId
      }
    })
  ]);

  clientAId = clientA.id;
  clientBId = clientB.id;

  const [adminA, adminB, manager] = await Promise.all([
    createUser(
      "Organization Admin A",
      `um-admin-a-${unique}@example.test`,
      "ORGANIZATION_ADMIN",
      organizationAId
    ),
    createUser(
      "Organization Admin B",
      `um-admin-b-${unique}@example.test`,
      "ORGANIZATION_ADMIN",
      organizationBId
    ),
    createUser(
      "User Management Manager",
      `um-manager-${unique}@example.test`,
      "MANAGER",
      organizationAId
    )
  ]);

  adminAId = adminA.id;
  managerId = manager.id;

  [adminAToken, adminBToken, managerToken] = await Promise.all([
    login(adminA.email),
    login(adminB.email),
    login(manager.email)
  ]);
});

after(async () => {
  const organizationIds = [organizationAId, organizationBId].filter(Boolean);

  if (organizationIds.length) {
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

    if (clientAId || clientBId) {
      await prisma.client.deleteMany({
        where: { id: { in: [clientAId, clientBId].filter(Boolean) } }
      });
    }

    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } }
    });
  }

  await prisma.$disconnect();
});

test("Organization Admin User Management API tests", async (t) => {
  await t.test("Organization Admin creates a Developer", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        name: "New Developer",
        email: `new-developer-${unique}@example.test`,
        password: "NewDeveloperPassword!123",
        role: "DEVELOPER"
      });

    assert.equal(response.status, 201);

    const user = await prisma.user.findUnique({
      where: { email: `new-developer-${unique}@example.test` }
    });

    assert.ok(user);
    assert.equal(user.organizationId, organizationAId);
    assert.equal(user.role, "DEVELOPER");
    assert.notEqual(user.passwordHash, "NewDeveloperPassword!123");
    assert.equal(
      await bcrypt.compare("NewDeveloperPassword!123", user.passwordHash),
      true
    );

    createdUserId = user.id;
    assert.equal(response.body.data.user.passwordHash, undefined);
  });

  await t.test("Organization Admin creates a Client User for its own client", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        name: "New Client User",
        email: `new-client-user-${unique}@example.test`,
        password: "NewClientUserPassword!123",
        role: "CLIENT_USER",
        clientId: clientAId
      });

    assert.equal(response.status, 201);

    const user = await prisma.user.findUnique({
      where: { email: `new-client-user-${unique}@example.test` }
    });

    assert.ok(user);
    assert.equal(user.organizationId, organizationAId);
    assert.equal(user.clientId, clientAId);
    assert.equal(user.role, "CLIENT_USER");
  });

  await t.test("Rejects a client belonging to another organization", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        name: "Cross Tenant Client User",
        email: `cross-tenant-${unique}@example.test`,
        password: "CrossTenantPassword!123",
        role: "CLIENT_USER",
        clientId: clientBId
      });

    assert.equal(response.status, 400);
  });

  await t.test("Organization Admin cannot create another Organization Admin", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        name: "Unauthorized Admin",
        email: `unauthorized-admin-${unique}@example.test`,
        password: "UnauthorizedAdminPassword!123",
        role: "ORGANIZATION_ADMIN"
      });

    assert.equal(response.status, 400);
  });

  await t.test("Manager cannot access User Management", async () => {
    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${managerToken}`);

    assert.equal(response.status, 403);
  });

  await t.test("Organization Admin sees only users in its organization", async () => {
    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${adminAToken}`);

    assert.equal(response.status, 200);

    const users = response.body.data.users as Array<{
      id: string;
      organizationId?: string;
      passwordHash?: string;
    }>;

    assert.ok(Array.isArray(users));
    assert.ok(users.every((user) => user.organizationId === undefined || user.organizationId === organizationAId));
    assert.ok(users.every((user) => user.passwordHash === undefined));
  });

  await t.test("Organization Admin cannot update another organization's user", async () => {
    const response = await request(app)
      .patch(`/api/v1/users/${managerId}`)
      .set("Authorization", `Bearer ${adminBToken}`)
      .send({ name: "Unauthorized Update" });

    assert.equal(response.status, 404);
  });

  await t.test("Organization Admin updates a user's name", async () => {
    const response = await request(app)
      .patch(`/api/v1/users/${createdUserId}`)
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({ name: "Updated Developer Name" });

    assert.equal(response.status, 200);

    const user = await prisma.user.findUnique({
      where: { id: createdUserId }
    });

    assert.equal(user?.name, "Updated Developer Name");
  });

  await t.test("Organization Admin deactivates a user and revokes refresh tokens", async () => {
    const target = await prisma.user.create({
      data: {
        name: "User To Deactivate",
        email: `deactivate-${unique}@example.test`,
        passwordHash: await bcrypt.hash(password, 12),
        role: "DEVELOPER",
        organizationId: organizationAId
      }
    });

    const response = await request(app)
      .patch(`/api/v1/users/${target.id}/status`)
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({ isActive: false });

    assert.equal(response.status, 200);

    const updated = await prisma.user.findUnique({
      where: { id: target.id }
    });

    assert.equal(updated?.isActive, false);

    const tokens = await prisma.refreshToken.findMany({
      where: { userId: target.id }
    });

    assert.ok(tokens.every((token) => token.revokedAt !== null));
  });
});
