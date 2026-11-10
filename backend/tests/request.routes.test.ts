import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();

const unique = Date.now();
const password = "TestPassword!123456";

const clientEmail = `request-api-client-${unique}@example.test`;
const managerEmail = `request-api-manager-${unique}@example.test`;

let organizationId: string;
let clientId: string;
let clientUserId: string;
let managerId: string;
let clientAccessToken: string;
let managerAccessToken: string;

before(async () => {
  const organization = await prisma.organization.create({
    data: {
      name: "Request API Test Organization",
      slug: `request-api-test-${unique}`
    }
  });

  organizationId = organization.id;

  const client = await prisma.client.create({
    data: {
      name: "Request API Test Client",
      organizationId
    }
  });

  clientId = client.id;

  const passwordHash = await bcrypt.hash(password, 12);

  const clientUser = await prisma.user.create({
    data: {
      name: "Request API Client User",
      email: clientEmail,
      passwordHash,
      role: "CLIENT_USER",
      organizationId,
      clientId
    }
  });

  clientUserId = clientUser.id;

  const manager = await prisma.user.create({
    data: {
      name: "Request API Manager",
      email: managerEmail,
      passwordHash,
      role: "MANAGER",
      organizationId
    }
  });

  managerId = manager.id;

  const clientLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: clientEmail, password });

  assert.equal(clientLogin.status, 200);
  clientAccessToken = clientLogin.body.data.accessToken;

  const managerLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: managerEmail, password });

  assert.equal(managerLogin.status, 200);
  managerAccessToken = managerLogin.body.data.accessToken;
});

after(async () => {
  if (organizationId) {
    await prisma.activityHistory.deleteMany({
      where: { organizationId }
    });

    await prisma.request.deleteMany({
      where: { organizationId }
    });
  }

  const userIds = [clientUserId, managerId].filter(Boolean);

  if (userIds.length > 0) {
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: userIds } }
    });

    await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });
  }

  if (clientId) {
    await prisma.client.deleteMany({
      where: { id: clientId }
    });
  }

  if (organizationId) {
    await prisma.organization.deleteMany({
      where: { id: organizationId }
    });
  }

  await prisma.$disconnect();
});

const validRequest = {
  title: "Create a customer dashboard",
  description: "Build a dashboard to monitor customer activity",
  category: "FEATURE",
  priority: "HIGH"
};

test("Request API integration tests", async (t) => {
  await t.test("rejects requests without authentication", async () => {
    const response = await request(app)
      .post("/api/v1/requests")
      .send(validRequest);

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
  });

  await t.test("rejects a Manager attempting to create a request", async () => {
    const response = await request(app)
      .post("/api/v1/requests")
      .set("Authorization", `Bearer ${managerAccessToken}`)
      .send(validRequest);

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
  });

  await t.test("rejects invalid request details", async () => {
    const response = await request(app)
      .post("/api/v1/requests")
      .set("Authorization", `Bearer ${clientAccessToken}`)
      .send({
        title: "",
        description: "Invalid request",
        category: "FEATURE"
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
  });

  await t.test("rejects frontend-supplied tenant and status fields", async () => {
    const response = await request(app)
      .post("/api/v1/requests")
      .set("Authorization", `Bearer ${clientAccessToken}`)
      .send({
        ...validRequest,
        organizationId,
        clientId,
        createdById: clientUserId,
        status: "APPROVED"
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
  });

  await t.test("creates a request for an authenticated Client User", async () => {
    const response = await request(app)
      .post("/api/v1/requests")
      .set("Authorization", `Bearer ${clientAccessToken}`)
      .send(validRequest);

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.request.title, validRequest.title);
    assert.equal(response.body.data.request.organizationId, organizationId);
    assert.equal(response.body.data.request.clientId, clientId);
    assert.equal(response.body.data.request.createdById, clientUserId);
    assert.equal(response.body.data.request.status, "DRAFT");

    const requestId = response.body.data.request.id;

    const history = await prisma.activityHistory.findFirst({
      where: {
        organizationId,
        requestId
      }
    });

    assert.ok(history);
    assert.equal(history.actorId, clientUserId);
    assert.equal(history.event, "REQUEST_CREATED");
  });
});