import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();
const unique = Date.now();
const password = "DeleteTestPassword!123";

let organizationId: string;
let clientId: string;
let clientUserId: string;
let adminId: string;
let clientToken: string;
let adminToken: string;
let ownDraftId: string;
let submittedRequestId: string;

async function createUser(
  name: string,
  email: string,
  role: "CLIENT_USER" | "ORGANIZATION_ADMIN",
  clientId?: string
) {
  return prisma.user.create({
    data: {
      name,
      email,
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
  const organization = await prisma.organization.create({
    data: {
      name: "Delete Test Organization",
      slug: `delete-test-${unique}`
    }
  });
  organizationId = organization.id;

  const client = await prisma.client.create({
    data: {
      name: "Delete Test Client",
      organizationId
    }
  });
  clientId = client.id;

  const clientUser = await createUser(
    "Delete Test Client User",
    `delete-client-${unique}@example.test`,
    "CLIENT_USER",
    clientId
  );

  const admin = await createUser(
    "Delete Test Admin",
    `delete-admin-${unique}@example.test`,
    "ORGANIZATION_ADMIN"
  );

  clientUserId = clientUser.id;
  adminId = admin.id;

  [clientToken, adminToken] = await Promise.all([
    login(clientUser.email),
    login(admin.email)
  ]);

  const [draft, submitted] = await Promise.all([
    prisma.request.create({
      data: {
        organizationId,
        clientId,
        createdById: clientUserId,
        title: "Draft request to delete",
        description: "Soft delete test",
        category: "FEATURE",
        priority: "MEDIUM"
      }
    }),
    prisma.request.create({
      data: {
        organizationId,
        clientId,
        createdById: clientUserId,
        title: "Submitted request",
        description: "Must not be deleted",
        category: "BUG",
        priority: "HIGH",
        status: "SUBMITTED"
      }
    })
  ]);

  ownDraftId = draft.id;
  submittedRequestId = submitted.id;
});

after(async () => {
  if (organizationId) {
    await prisma.activityHistory.deleteMany({
      where: { organizationId }
    });

    await prisma.request.deleteMany({
      where: { organizationId }
    });

    const users = await prisma.user.findMany({
      where: { organizationId },
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

    if (clientId) {
      await prisma.client.deleteMany({ where: { id: clientId } });
    }

    await prisma.organization.deleteMany({
      where: { id: organizationId }
    });
  }

  await prisma.$disconnect();
});

test("Draft request soft deletion API tests", async (t) => {
  await t.test("Client User can soft-delete their own Draft request", async () => {
    const response = await request(app)
      .delete(`/api/v1/requests/${ownDraftId}`)
      .set("Authorization", `Bearer ${clientToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.deleted, true);

    const deletedRequest = await prisma.request.findUnique({
      where: { id: ownDraftId }
    });

    assert.ok(deletedRequest?.deletedAt);
  });

  await t.test("Client User cannot delete a Submitted request", async () => {
    const response = await request(app)
      .delete(`/api/v1/requests/${submittedRequestId}`)
      .set("Authorization", `Bearer ${clientToken}`);

    assert.equal(response.status, 404);

    const submittedRequest = await prisma.request.findUnique({
      where: { id: submittedRequestId }
    });

    assert.equal(submittedRequest?.deletedAt, null);
  });

  await t.test("Organization Admin can soft-delete a Draft request", async () => {
    const adminDraft = await prisma.request.create({
      data: {
        organizationId,
        clientId,
        createdById: clientUserId,
        title: "Admin deletion test",
        description: "Organization Admin deletion",
        category: "FEATURE",
        priority: "LOW"
      }
    });

    const response = await request(app)
      .delete(`/api/v1/requests/${adminDraft.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);

    const deletedRequest = await prisma.request.findUnique({
      where: { id: adminDraft.id }
    });

    assert.ok(deletedRequest?.deletedAt);
  });
});
