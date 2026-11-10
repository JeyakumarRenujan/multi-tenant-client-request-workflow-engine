-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'ORGANIZATION_ADMIN', 'MANAGER', 'DEVELOPER', 'CLIENT_USER');

-- CreateEnum
CREATE TYPE "RequestCategory" AS ENUM ('FEATURE', 'BUG', 'CHANGE_REQUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "RequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "client_id" UUID,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "contact_email" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "assigned_to_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "RequestCategory" NOT NULL,
    "priority" "RequestPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "due_date" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_history" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "actor_id" UUID,
    "event" VARCHAR(100) NOT NULL,
    "previous_status" "RequestStatus",
    "new_status" "RequestStatus",
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_role_idx" ON "users"("organization_id", "role");

-- CreateIndex
CREATE INDEX "users_client_id_idx" ON "users"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_organization_id_key" ON "users"("id", "organization_id");

-- CreateIndex
CREATE INDEX "clients_organization_id_idx" ON "clients"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_id_organization_id_key" ON "clients"("id", "organization_id");

-- CreateIndex
CREATE INDEX "requests_organization_id_status_idx" ON "requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "requests_organization_id_priority_idx" ON "requests"("organization_id", "priority");

-- CreateIndex
CREATE INDEX "requests_organization_id_client_id_idx" ON "requests"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "requests_organization_id_assigned_to_id_idx" ON "requests"("organization_id", "assigned_to_id");

-- CreateIndex
CREATE INDEX "requests_organization_id_due_date_idx" ON "requests"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "requests_organization_id_deleted_at_idx" ON "requests"("organization_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "requests_id_organization_id_key" ON "requests"("id", "organization_id");

-- CreateIndex
CREATE INDEX "activity_history_organization_id_request_id_created_at_idx" ON "activity_history"("organization_id", "request_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_history_actor_id_idx" ON "activity_history"("actor_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_client_id_organization_id_fkey" FOREIGN KEY ("client_id", "organization_id") REFERENCES "clients"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_client_id_organization_id_fkey" FOREIGN KEY ("client_id", "organization_id") REFERENCES "clients"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_created_by_id_organization_id_fkey" FOREIGN KEY ("created_by_id", "organization_id") REFERENCES "users"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_assigned_to_id_organization_id_fkey" FOREIGN KEY ("assigned_to_id", "organization_id") REFERENCES "users"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_history" ADD CONSTRAINT "activity_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_history" ADD CONSTRAINT "activity_history_request_id_organization_id_fkey" FOREIGN KEY ("request_id", "organization_id") REFERENCES "requests"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_history" ADD CONSTRAINT "activity_history_actor_id_organization_id_fkey" FOREIGN KEY ("actor_id", "organization_id") REFERENCES "users"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce valid organization and client scopes for each user role.
ALTER TABLE "users"
ADD CONSTRAINT "users_role_scope_check"
CHECK (
    (
        "role" = 'PLATFORM_ADMIN'
        AND "organization_id" IS NULL
        AND "client_id" IS NULL
    )
    OR
    (
        "role" IN ('ORGANIZATION_ADMIN', 'MANAGER', 'DEVELOPER')
        AND "organization_id" IS NOT NULL
        AND "client_id" IS NULL
    )
    OR
    (
        "role" = 'CLIENT_USER'
        AND "organization_id" IS NOT NULL
        AND "client_id" IS NOT NULL
    )
);

-- Request versions must always be positive.
ALTER TABLE "requests"
ADD CONSTRAINT "requests_version_check"
CHECK ("version" >= 1);

-- Rejected requests must have a non-empty rejection reason.
ALTER TABLE "requests"
ADD CONSTRAINT "requests_rejection_reason_check"
CHECK (
    "status" <> 'REJECTED'
    OR (
        "rejection_reason" IS NOT NULL
        AND length(btrim("rejection_reason")) > 0
    )
);