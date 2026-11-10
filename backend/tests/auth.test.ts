import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();

const email = `auth-test-${Date.now()}@example.test`;
const password = "TestPassword!123456";
const allowedOrigin = "http://localhost:5173";

let userId: string;
let organizationId: string;
let accessToken: string;
let oldRefreshCookie: string;
let agent: ReturnType<typeof request.agent>;

before(async () => {
  const organization = await prisma.organization.create({
    data: {
      name: "Authentication Test Organization",
      slug: `auth-test-${Date.now()}`
    }
  });

  organizationId = organization.id;

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: "Authentication Test User",
      email,
      passwordHash,
      role: "ORGANIZATION_ADMIN",
      organizationId
    }
  });

  userId = user.id;
  agent = request.agent(app);
});

after(async () => {
  if (userId) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }

  if (organizationId) {
    await prisma.organization.delete({ where: { id: organizationId } });
  }

  await prisma.$disconnect();
});

test("Authentication integration tests", async (t) => {
  await t.test("rejects malformed login details", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "not-an-email", password: "" });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
  });

  await t.test("rejects incorrect password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email,
        password: "IncorrectPassword123!"
      });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
  });

  await t.test("rejects refresh requests from an untrusted Origin", async () => {
    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Origin", "http://malicious.example");

    assert.equal(response.status, 403);
  });

  await t.test("logs in with valid credentials", async () => {
    const response = await agent
      .post("/api/v1/auth/login")
      .send({ email, password });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.user.email, email);
    assert.equal(response.body.data.user.role, "ORGANIZATION_ADMIN");

    accessToken = response.body.data.accessToken;

    assert.ok(accessToken);

    const cookies = response.headers["set-cookie"] as string[];
    assert.ok(cookies?.some((cookie) =>
      cookie.startsWith("workflow_refresh=")
    ));

    const refreshCookie = cookies.find((cookie) =>
      cookie.startsWith("workflow_refresh=")
    );

    assert.ok(refreshCookie);
    oldRefreshCookie = refreshCookie.split(";")[0];
    assert.match(refreshCookie, /HttpOnly/i);
  });

  await t.test("rejects /me without authentication", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me");

    assert.equal(response.status, 401);
  });

  await t.test("returns authenticated user from /me", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.user.id, userId);
    assert.equal(response.body.data.user.email, email);
    assert.equal(response.body.data.user.organizationId, organizationId);
  });

  await t.test("rotates the refresh token", async () => {
    const response = await agent
      .post("/api/v1/auth/refresh")
      .set("Origin", allowedOrigin);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.data.accessToken);

    accessToken = response.body.data.accessToken;

    const cookies = response.headers["set-cookie"] as string[];
    const newCookie = cookies?.find((cookie) =>
      cookie.startsWith("workflow_refresh=")
    );

    assert.ok(newCookie);

    const newRefreshCookie = newCookie.split(";")[0];
    assert.notEqual(newRefreshCookie, oldRefreshCookie);
  });

  await t.test("rejects reuse of the old refresh token", async () => {
    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Origin", allowedOrigin)
      .set("Cookie", oldRefreshCookie);

    assert.equal(response.status, 401);
  });

  await t.test("logs out successfully", async () => {
    const response = await agent
      .post("/api/v1/auth/logout")
      .set("Origin", allowedOrigin);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
  });

  await t.test("rejects refresh after logout", async () => {
    const response = await agent
      .post("/api/v1/auth/refresh")
      .set("Origin", allowedOrigin);

    assert.equal(response.status, 401);
  });
});