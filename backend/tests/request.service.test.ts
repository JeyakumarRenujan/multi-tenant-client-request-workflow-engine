import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  createRequest,
  RequestError
} from "../src/modules/requests/request.service";
import { createRequestSchema } from "../src/modules/requests/request.validation";

const prisma = new PrismaClient();

const unique = Date.now();
let organizationId: string;
let otherOrganizationId: string;
let clientId: string;
let otherClientId: string;
let userId: string;
let managerId: string;
let passwordHash: string;

before(async () => {
  const organization = await prisma.organization.create({
    data: {
      name: "Request Service Test Organization",
      slug: `request-service-test-${unique}`
    }
  });

  organizationId = organization.id;

  const otherOrganization = await prisma.organization.create({
    data: {
      name: "Other Request Test Organization",
      slug: `request-service-other-${unique}`
    }
  });

  otherOrganizationId = otherOrganization.id;

  const client = await prisma.client.create({
    data: {
      name: "Request Test Client",
      organizationId
    }
  });

  clientId = client.id;

  const otherClient = await prisma.client.create({
    data: {
      name: "Other Request Test Client",
      organizationId: otherOrganizationId
    }
  });

  otherClientId = otherClient.id;

  passwordHash = await bcrypt.hash("TestPassword!123456", 12);

  const user = await prisma.user.create({
    data: {
      name: "Request Test Client User",
      email: `request-client-${unique}@example.test`,
      passwordHash,
      role: "CLIENT_USER",
      organizationId,
      clientId
    }
  });

  userId = user.id;

  const manager = await prisma.user.create({
    data: {
      name: "Request Test Manager",
      email: `request-manager-${unique}@example.test`,
      passwordHash,
      role: "MANAGER",
      organizationId
    }
  });

  managerId = manager.id;
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

  if (userId || managerId) {
    await prisma.refreshToken.deleteMany({
      where: {
        userId: { in: [userId, managerId].filter(Boolean) }
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: { in: [userId, managerId].filter(Boolean) }
      }
    });
  }

  if (clientId || otherClientId) {
    await prisma.client.deleteMany({
      where: {
        id: { in: [clientId, otherClientId].filter(Boolean) }
      }
    });
  }

  if (organizationId || otherOrganizationId) {
    await prisma.organization.deleteMany({
      where: {
        id: {
          in: [organizationId, otherOrganizationId].filter(Boolean)
        }
      }
    });
  }

  await prisma.$disconnect();
});

const validInput = createRequestSchema.parse({
  title: "Add a payment dashboard",
  description: "Create a dashboard to monitor payment requests",
  category: "FEATURE",
  priority: "HIGH"
});

test("Request service integration tests", async (t) => {
  await t.test("allows a Client User to create a request", async () => {
    const request = await createRequest(validInput, {
      id: userId,
      role: "CLIENT_USER",
      organizationId,
      clientId
    });

    assert.ok(request.id);
    assert.equal(request.title, validInput.title);
    assert.equal(request.organizationId, organizationId);
    assert.equal(request.clientId, clientId);
    assert.equal(request.createdById, userId);
    assert.equal(request.status, "DRAFT");
    assert.equal(request.priority, "HIGH");

    const storedRequest = await prisma.request.findUnique({
      where: { id: request.id }
    });

    assert.ok(storedRequest);
  });

  await t.test("creates a REQUEST_CREATED activity history entry", async () => {
    const request = await createRequest(validInput, {
      id: userId,
      role: "CLIENT_USER",
      organizationId,
      clientId
    });

    const history = await prisma.activityHistory.findFirst({
      where: {
        organizationId,
        requestId: request.id
      }
    });

    assert.ok(history);
    assert.equal(history.actorId, userId);
    assert.equal(history.event, "REQUEST_CREATED");
    assert.equal(history.newStatus, "DRAFT");
  });

  await t.test("rejects a Manager attempting to create a request", async () => {
    await assert.rejects(
      createRequest(validInput, {
        id: managerId,
        role: "MANAGER",
        organizationId,
        clientId: null
      }),
      (error: unknown) => {
        assert.ok(error instanceof RequestError);
        assert.equal(error.statusCode, 403);
        return true;
      }
    );

    const requestCount = await prisma.request.count({
      where: { organizationId }
    });

    assert.equal(requestCount, 2);
  });

  await t.test("rejects a Client User without organization or client association", async () => {
    await assert.rejects(
      createRequest(validInput, {
        id: userId,
        role: "CLIENT_USER",
        organizationId: null,
        clientId: null
      }),
      (error: unknown) => {
        assert.ok(error instanceof RequestError);
        assert.equal(error.statusCode, 403);
        return true;
      }
    );
  });

  await t.test("rejects a client belonging to another organization", async () => {
    const beforeCount = await prisma.request.count({
      where: { organizationId }
    });

    await assert.rejects(
      createRequest(validInput, {
        id: userId,
        role: "CLIENT_USER",
        organizationId,
        clientId: otherClientId
      })
    );

    const afterCount = await prisma.request.count({
      where: { organizationId }
    });

    assert.equal(afterCount, beforeCount);
  });
});