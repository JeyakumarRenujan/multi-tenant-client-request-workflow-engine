import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";
import app from "../src/app";

test("GET /api/docs.json returns the OpenAPI specification", async () => {
  const response = await request(app).get("/api/docs.json");

  assert.equal(response.status, 200);
  assert.equal(response.body.openapi, "3.0.3");
  assert.ok(response.body.info);
  assert.ok(response.body.paths["/api/v1/auth/login"]);
  assert.ok(response.body.paths["/api/v1/requests"]);
  assert.ok(response.body.paths["/api/v1/requests/{id}/status"]);
  assert.ok(response.body.paths["/api/v1/dashboard/summary"]);
  assert.ok(response.body.components.securitySchemes.bearerAuth);
});

test("GET /api/docs/ serves the Swagger UI page", async () => {
  const response = await request(app).get("/api/docs/");

  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /text\/html/);
  assert.match(response.text, /swagger/i);
});
