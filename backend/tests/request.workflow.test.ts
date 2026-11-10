import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();
const unique = Date.now();
const password = "WorkflowTestPassword!123";

let organizationId: string;
let clientId: string;
let managerId: string;
let clientUserId: string;
let developerId: string;
let otherClientUserId: string;

let managerToken: string;
let clientToken: string;
let developerToken: string;
let otherClientToken: string;

let workflowRequestId: string;
let rejectionRequestId: string;
let otherClientRequestId: string;

async function createUser(
  name: string,
  role: "MANAGER" | "CLIENT_USER" | "DEVELOPER",
  clientAssociation: string | null = null
) {
  return prisma.user.create({
    data: {
      name,
      email: `workflow-${name.toLowerCase().replace(/\s/g, "-")}-${unique}@example.test`,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      organizationId,
      clientId: clientAssociation
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

async function createRequest(creatorId: string, title: string) {
  return prisma.request.create({
    data: {
      organizationId,
      clientId,
      createdById: creatorId,
      title,
      description: "Workflow integration test",
      category: "FEATURE",
      priority: "MEDIUM",
      status: "DRAFT"
    }
  });
}

before(async () => {
  const organization = await prisma.organization.create({
    data: {
      name: "Workflow Test Organization",
      slug: `workflow-test-${unique}`
    }
  });

  organizationId = organization.id;

  const client = await prisma.client.create({
    data: {
      name: "Workflow Test Client",
      organizationId
    }
  });

  clientId = client.id;

  const [manager, clientUser, developer, otherClientUser] = await Promise.all([
    createUser("Workflow Manager", "MANAGER"),
    createUser("Workflow Client User", "CLIENT_USER", clientId),
    createUser("Workflow Developer", "DEVELOPER"),
    createUser("Workflow Other Client User", "CLIENT_USER", clientId)
  ]);

  managerId = manager.id;
  clientUserId = clientUser.id;
  developerId = developer.id;
  otherClientUserId = otherClientUser.id;

  [managerToken, clientToken, developerToken, otherClientToken] =
    await Promise.all([
      login(manager.email),
      login(clientUser.email),
      login(developer.email),
      login(otherClientUser.email)
    ]);

  const [mainRequest, rejectionRequest, otherRequest] = await Promise.all([
    createRequest(clientUserId, "Main workflow request"),
    createRequest(clientUserId, "Rejection workflow request"),
    createRequest(otherClientUserId, "Other user's request")
  ]);

  workflowRequestId = mainRequest.id;
  rejectionRequestId = rejectionRequest.id;
  otherClientRequestId = otherRequest.id;
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

    await prisma.client.deleteMany({
      where: { organizationId }
    });

    await prisma.organization.delete({
      where: { id: organizationId }
    });
  }

  await prisma.$disconnect();
});

test("Request workflow lifecycle API tests", async (t) => {
  await t.test("Client User submits their own Draft request", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${workflowRequestId}/status`)
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ version: 1, status: "SUBMITTED" });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.request.status, "SUBMITTED");
    assert.equal(response.body.data.request.version, 2);
  });

  await t.test("another Client User cannot submit someone else's request", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${workflowRequestId}/status`)
      .set("Authorization", `Bearer ${otherClientToken}`)
      .send({ version: 2, status: "SUBMITTED" });

    assert.equal(response.status, 404);
  });

  await t.test("Manager moves Submitted request into review", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${workflowRequestId}/status`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ version: 2, status: "UNDER_REVIEW" });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.request.status, "UNDER_REVIEW");
    assert.equal(response.body.data.request.version, 3);
  });

  await t.test("Manager approves a request under review", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${workflowRequestId}/status`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ version: 3, status: "APPROVED" });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.request.status, "APPROVED");
    assert.equal(response.body.data.request.version, 4);
  });

  await t.test("unassigned Developer cannot start the work", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${workflowRequestId}/status`)
      .set("Authorization", `Bearer ${developerToken}`)
      .send({ version: 4, status: "IN_PROGRESS" });

    assert.equal(response.status, 404);
  });

  await t.test("Manager assigns the Developer", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${workflowRequestId}/assignment`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ version: 4, assignedToId: developerId });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.request.version, 5);
  });

  await t.test("assigned Developer starts the work", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${workflowRequestId}/status`)
      .set("Authorization", `Bearer ${developerToken}`)
      .send({ version: 5, status: "IN_PROGRESS" });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.request.status, "IN_PROGRESS");
    assert.equal(response.body.data.request.version, 6);
  });

  await t.test("assigned Developer completes the work", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${workflowRequestId}/status`)
      .set("Authorization", `Bearer ${developerToken}`)
      .send({ version: 6, status: "COMPLETED" });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.request.status, "COMPLETED");
    assert.equal(response.body.data.request.version, 7);
  });

  await t.test("workflow transitions create activity history", async () => {
    const history = await prisma.activityHistory.findMany({
      where: {
        requestId: workflowRequestId,
        event: "REQUEST_STATUS_CHANGED"
      },
      orderBy: { createdAt: "asc" }
    });

    assert.equal(history.length, 5);
    assert.equal(history[0].previousStatus, "DRAFT");
    assert.equal(history[0].newStatus, "SUBMITTED");
    assert.equal(history[0].actorId, clientUserId);
    assert.equal(history[1].previousStatus, "SUBMITTED");
    assert.equal(history[1].newStatus, "UNDER_REVIEW");
    assert.equal(history[1].actorId, managerId);
    assert.equal(history[2].newStatus, "APPROVED");
    assert.equal(history[3].newStatus, "IN_PROGRESS");
    assert.equal(history[4].previousStatus, "IN_PROGRESS");
    assert.equal(history[4].newStatus, "COMPLETED");
    assert.equal(history[4].actorId, developerId);
  });

  await t.test("rejecting without a reason is invalid", async () => {
    await request(app)
      .patch(`/api/v1/requests/${rejectionRequestId}/status`)
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ version: 1, status: "SUBMITTED" });

    await request(app)
      .patch(`/api/v1/requests/${rejectionRequestId}/status`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ version: 2, status: "UNDER_REVIEW" });

    const response = await request(app)
      .patch(`/api/v1/requests/${rejectionRequestId}/status`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ version: 3, status: "REJECTED" });

    assert.equal(response.status, 400);
  });

  await t.test("Manager rejects a request with a reason", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${rejectionRequestId}/status`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        version: 3,
        status: "REJECTED",
        rejectionReason: "The requested feature is outside the agreed scope."
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.request.status, "REJECTED");
    assert.equal(
      response.body.data.request.rejectionReason,
      "The requested feature is outside the agreed scope."
    );
    assert.equal(response.body.data.request.version, 4);
  });

  await t.test("Rejected request cannot be reopened", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${rejectionRequestId}/status`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ version: 4, status: "UNDER_REVIEW" });

    assert.equal(response.status, 409);
  });

  await t.test("Client User cannot approve a request", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${workflowRequestId}/status`)
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ version: 7, status: "APPROVED" });

    assert.equal(response.status, 409);
  });

  await t.test("stale workflow version is rejected", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${workflowRequestId}/status`)
      .set("Authorization", `Bearer ${developerToken}`)
      .send({ version: 6, status: "COMPLETED" });

    assert.equal(response.status, 409);
  });

  await t.test("invalid status transition is rejected", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${rejectionRequestId}/status`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ version: 4, status: "COMPLETED" });

    assert.equal(response.status, 409);
  });

  await t.test("workflow transition requires authentication", async () => {
    const response = await request(app)
      .patch(`/api/v1/requests/${workflowRequestId}/status`)
      .send({ version: 7, status: "COMPLETED" });

    assert.equal(response.status, 401);
  });
});