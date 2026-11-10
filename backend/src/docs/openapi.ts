export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Multi-Tenant Client Request & Approval Workflow Engine API",
    version: "1.0.0",
    description: `
API documentation for the Multi-Tenant Client Request & Approval Workflow Engine.

Authentication:
- Login returns a short-lived JWT access token. Send it using the Bearer authorization scheme.
- Refresh tokens are stored in an HttpOnly cookie named workflow_refresh.
- Refresh and logout require the browser to send the refresh cookie and an allowed Origin.

Tenant isolation:
- Organization and client scope are derived from the authenticated user.
- Clients and organization IDs must not be supplied as trusted tenant filters.
- Platform administrators do not automatically have access to tenant request data.

Concurrency:
- Request updates, assignments, and workflow transitions require the current version.
- A stale version returns HTTP 409 Conflict.
    `
  },
  servers: [{ url: "/", description: "Current API host" }],
  tags: [
    { name: "Health", description: "Service health" },
    { name: "Authentication", description: "Login, refresh, logout and current user" },
    { name: "Requests", description: "Tenant-scoped client requests and workflow" },
    { name: "Dashboard", description: "Role-scoped dashboard metrics" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Access token returned by the login or refresh endpoint."
      },
      refreshCookie: {
        type: "apiKey",
        in: "cookie",
        name: "workflow_refresh",
        description: "HttpOnly refresh-token cookie. The browser manages this cookie."
      }
    },
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Access denied" }
        },
        required: ["success", "message"]
      },
      UserRole: {
        type: "string",
        enum: ["PLATFORM_ADMIN", "ORGANIZATION_ADMIN", "MANAGER", "DEVELOPER", "CLIENT_USER"]
      },
      RequestCategory: {
        type: "string",
        enum: ["FEATURE", "BUG", "CHANGE_REQUEST", "OTHER"]
      },
      RequestPriority: {
        type: "string",
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
      },
      RequestStatus: {
        type: "string",
        enum: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "IN_PROGRESS", "COMPLETED"]
      },
      User: {
        type: "object",
        description: "Authenticated user information. Password hashes and refresh tokens are never returned.",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { $ref: "#/components/schemas/UserRole" },
          organizationId: { type: "string", format: "uuid", nullable: true },
          clientId: { type: "string", format: "uuid", nullable: true }
        }
      },
      LoginRequest: {
        type: "object",
        additionalProperties: false,
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", maxLength: 255 },
          password: { type: "string", minLength: 1, maxLength: 128, format: "password" }
        }
      },
      LoginResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Login successful" },
          data: {
            type: "object",
            properties: {
              accessToken: { type: "string" },
              user: { $ref: "#/components/schemas/User" }
            },
            required: ["accessToken", "user"]
          }
        },
        required: ["success", "message", "data"]
      },
      RefreshResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Session refreshed" },
          data: {
            type: "object",
            properties: {
              accessToken: { type: "string" }
            },
            required: ["accessToken"]
          }
        },
        required: ["success", "message", "data"]
      },
      Request: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          organizationId: { type: "string", format: "uuid" },
          clientId: { type: "string", format: "uuid" },
          createdById: { type: "string", format: "uuid" },
          assignedToId: { type: "string", format: "uuid", nullable: true },
          title: { type: "string", maxLength: 200 },
          description: { type: "string" },
          category: { $ref: "#/components/schemas/RequestCategory" },
          priority: { $ref: "#/components/schemas/RequestPriority" },
          status: { $ref: "#/components/schemas/RequestStatus" },
          dueDate: { type: "string", format: "date-time", nullable: true },
          rejectionReason: { type: "string", nullable: true },
          version: { type: "integer", minimum: 1 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      CreateRequest: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "category"],
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: "string", minLength: 1 },
          category: { $ref: "#/components/schemas/RequestCategory" },
          priority: { $ref: "#/components/schemas/RequestPriority", default: "MEDIUM" },
          dueDate: { type: "string", format: "date-time", description: "ISO date-time with timezone offset." }
        }
      },
      UpdateRequest: {
        type: "object",
        additionalProperties: false,
        required: ["version"],
        properties: {
          version: { type: "integer", minimum: 1, description: "Current request version." },
          title: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: "string", minLength: 1 },
          category: { $ref: "#/components/schemas/RequestCategory" },
          priority: { $ref: "#/components/schemas/RequestPriority" },
          dueDate: { type: "string", format: "date-time", nullable: true }
        }
      },
      AssignRequest: {
        type: "object",
        additionalProperties: false,
        required: ["version", "assignedToId"],
        properties: {
          version: { type: "integer", minimum: 1 },
          assignedToId: { type: "string", format: "uuid", nullable: true, description: "ID of an active Developer in the same organization, or null to unassign." }
        }
      },
      TransitionRequest: {
        type: "object",
        additionalProperties: false,
        required: ["version", "status"],
        properties: {
          version: { type: "integer", minimum: 1 },
          status: {
            type: "string",
            enum: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "IN_PROGRESS", "COMPLETED"]
          },
          rejectionReason: { type: "string", minLength: 1, maxLength: 2000, description: "Required when status is REJECTED. Not accepted for other transitions." }
        }
      },
      RequestResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              request: { $ref: "#/components/schemas/Request" }
            },
            required: ["request"]
          }
        }
      },
      RequestListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              requests: {
                type: "array",
                items: { $ref: "#/components/schemas/Request" }
              },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  total: { type: "integer" },
                  totalPages: { type: "integer" }
                },
                required: ["page", "limit", "total", "totalPages"]
              }
            },
            required: ["requests", "pagination"]
          }
        }
      },
      DashboardSummary: {
        type: "object",
        properties: {
          totalRequests: { type: "integer" },
          statusCounts: {
            type: "object",
            description: "Count for each request status.",
            additionalProperties: { type: "integer" }
          },
          priorityCounts: {
            type: "object",
            description: "Count for each request priority.",
            additionalProperties: { type: "integer" }
          },
          overdueCount: { type: "integer" },
          generatedAt: { type: "string", format: "date-time" }
        },
        required: ["totalRequests", "statusCounts", "priorityCounts", "overdueCount", "generatedAt"]
      },
      DashboardResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: { $ref: "#/components/schemas/DashboardSummary" }
        }
      }
    }
  },
  paths: {
    "/api/v1/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health",
        security: [],
        responses: {
          "200": {
            description: "API is running.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        environment: { type: "string" },
                        timestamp: { type: "string", format: "date-time" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Log in",
        description: "Authenticates a provisioned user. Returns an access token and sets the HttpOnly refresh-token cookie.",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } }
        },
        responses: {
          "200": {
            description: "Login successful. Refresh token is set as a cookie.",
            headers: {
              "Set-Cookie": {
                description: "HttpOnly workflow_refresh cookie.",
                schema: { type: "string" }
              }
            },
            content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } }
          },
          "400": { description: "Invalid request body.", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "401": { description: "Invalid credentials.", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "429": { description: "Too many login attempts." }
        }
      }
    },
    "/api/v1/auth/refresh": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh access token",
        description: "Uses the workflow_refresh cookie. The refresh token is rotated; an allowed Origin is required. The request body is not used.",
        security: [{ refreshCookie: [] }],
        responses: {
          "200": { description: "Session refreshed and refresh cookie rotated.", content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshResponse" } } } },
          "401": { description: "Refresh token missing, invalid, expired, or revoked.", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "403": { description: "Origin is not allowed." },
          "429": { description: "Too many refresh attempts." }
        }
      }
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Log out",
        description: "Revokes the refresh-token session and clears the workflow_refresh cookie. An allowed Origin is required.",
        security: [{ refreshCookie: [] }],
        responses: {
          "200": { description: "Logout successful." },
          "403": { description: "Origin is not allowed." }
        }
      }
    },
    "/api/v1/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user details.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: { user: { $ref: "#/components/schemas/User" } }
                    }
                  }
                }
              }
            }
          },
          "401": { description: "Missing or invalid access token." }
        }
      }
    },
    "/api/v1/requests": {
      get: {
        tags: ["Requests"],
        summary: "List requests",
        description: "Returns requests visible to the authenticated user. Tenant and client scope are derived from the access token, not query parameters.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { in: "query", name: "status", schema: { $ref: "#/components/schemas/RequestStatus" } },
          { in: "query", name: "priority", schema: { $ref: "#/components/schemas/RequestPriority" } },
          { in: "query", name: "category", schema: { $ref: "#/components/schemas/RequestCategory" } }
        ],
        responses: {
          "200": { description: "Requests and pagination data.", content: { "application/json": { schema: { $ref: "#/components/schemas/RequestListResponse" } } } },
          "400": { description: "Invalid query parameters." },
          "401": { description: "Authentication required." },
          "403": { description: "Role has no request visibility." }
        }
      },
      post: {
        tags: ["Requests"],
        summary: "Create a request",
        description: "CLIENT_USER only. Organization, client and creator IDs are derived from the authenticated user. New requests start in DRAFT.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateRequest" } } }
        },
        responses: {
          "201": { description: "Request created.", content: { "application/json": { schema: { $ref: "#/components/schemas/RequestResponse" } } } },
          "400": { description: "Invalid request body." },
          "401": { description: "Authentication required." },
          "403": { description: "Only client users can create requests." }
        }
      }
    },
    "/api/v1/requests/{id}": {
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }
      ],
      get: {
        tags: ["Requests"],
        summary: "Get a request",
        description: "Returns a request only if it is within the authenticated user's visibility scope.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Request details.", content: { "application/json": { schema: { $ref: "#/components/schemas/RequestResponse" } } } },
          "400": { description: "Invalid request ID." },
          "401": { description: "Authentication required." },
          "403": { description: "Request access denied." },
          "404": { description: "Request not found or not visible." }
        }
      },
      patch: {
        tags: ["Requests"],
        summary: "Update request details",
        description: "MANAGER only. Requires the current version. Only supplied fields are updated.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateRequest" } } }
        },
        responses: {
          "200": { description: "Request updated.", content: { "application/json": { schema: { $ref: "#/components/schemas/RequestResponse" } } } },
          "400": { description: "Invalid request ID or body." },
          "401": { description: "Authentication required." },
          "403": { description: "Only managers can update requests." },
          "404": { description: "Request not found." },
          "409": { description: "Stale version; refresh the request and retry." }
        }
      }
    },
    "/api/v1/requests/{id}/assignment": {
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }
      ],
      patch: {
        tags: ["Requests"],
        summary: "Assign or unassign a request",
        description: "MANAGER only. The assignee must be an active DEVELOPER in the same organization. Use null to unassign.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AssignRequest" } } }
        },
        responses: {
          "200": { description: "Assignment updated.", content: { "application/json": { schema: { $ref: "#/components/schemas/RequestResponse" } } } },
          "400": { description: "Invalid assignee or request body." },
          "401": { description: "Authentication required." },
          "403": { description: "Only managers can assign requests." },
          "404": { description: "Request not found." },
          "409": { description: "Stale request version." }
        }
      }
    },
    "/api/v1/requests/{id}/status": {
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }
      ],
      patch: {
        tags: ["Requests"],
        summary: "Change request workflow status",
        description: `
Allowed transitions:
- CLIENT_USER: DRAFT → SUBMITTED (only own request).
- MANAGER: SUBMITTED → UNDER_REVIEW.
- MANAGER: UNDER_REVIEW → APPROVED or REJECTED.
- DEVELOPER: APPROVED → IN_PROGRESS.
- DEVELOPER: IN_PROGRESS → COMPLETED.

A rejection reason is required for REJECTED. REJECTED is terminal. Every transition requires the current version.
        `,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/TransitionRequest" } } }
        },
        responses: {
          "200": { description: "Workflow status updated.", content: { "application/json": { schema: { $ref: "#/components/schemas/RequestResponse" } } } },
          "400": { description: "Invalid request ID or transition body." },
          "401": { description: "Authentication required." },
          "403": { description: "Role is not permitted to perform this transition." },
          "404": { description: "Request not found or not visible." },
          "409": { description: "Transition not permitted or request version is stale." }
        }
      }
    },
    "/api/v1/dashboard/summary": {
      get: {
        tags: ["Dashboard"],
        summary: "Get dashboard summary",
        description: "Returns metrics scoped to the authenticated user's visibility: organization-wide for Organization Admins and Managers, own client for Client Users, and assigned requests for Developers. Platform Admin access is denied. Overdue requests are calculated dynamically.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Dashboard metrics.", content: { "application/json": { schema: { $ref: "#/components/schemas/DashboardResponse" } } } },
          "401": { description: "Authentication required." },
          "403": { description: "Dashboard access denied for this role." }
        }
      }
    }
  }
} as const;
