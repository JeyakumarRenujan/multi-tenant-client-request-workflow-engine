import test from "node:test";
import assert from "node:assert/strict";
import { createRequestSchema } from "../src/modules/requests/request.validation";

test("accepts a valid request with default priority", () => {
  const result = createRequestSchema.safeParse({
    title: "Add a dashboard",
    description: "Create a dashboard for request tracking",
    category: "FEATURE"
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.priority, "MEDIUM");
  }
});

test("accepts a valid request with explicit priority and due date", () => {
  const result = createRequestSchema.safeParse({
    title: "Fix login",
    description: "Resolve the login issue",
    category: "BUG",
    priority: "HIGH",
    dueDate: "2026-12-01T10:00:00Z"
  });

  assert.equal(result.success, true);
});

test("rejects an empty title", () => {
  const result = createRequestSchema.safeParse({
    title: "   ",
    description: "Some description",
    category: "FEATURE"
  });

  assert.equal(result.success, false);
});

test("rejects a title longer than 200 characters", () => {
  const result = createRequestSchema.safeParse({
    title: "A".repeat(201),
    description: "Some description",
    category: "FEATURE"
  });

  assert.equal(result.success, false);
});

test("rejects an unsupported category", () => {
  const result = createRequestSchema.safeParse({
    title: "Test request",
    description: "Some description",
    category: "SUPPORT"
  });

  assert.equal(result.success, false);
});

test("rejects an unsupported priority", () => {
  const result = createRequestSchema.safeParse({
    title: "Test request",
    description: "Some description",
    category: "FEATURE",
    priority: "URGENT"
  });

  assert.equal(result.success, false);
});

test("rejects frontend-supplied tenant and ownership fields", () => {
  const result = createRequestSchema.safeParse({
    title: "Test request",
    description: "Some description",
    category: "FEATURE",
    organizationId: "untrusted-org-id",
    clientId: "untrusted-client-id",
    createdById: "untrusted-user-id",
    status: "APPROVED"
  });

  assert.equal(result.success, false);
});

test("rejects an invalid due date", () => {
  const result = createRequestSchema.safeParse({
    title: "Test request",
    description: "Some description",
    category: "FEATURE",
    dueDate: "not-a-date"
  });

  assert.equal(result.success, false);
});