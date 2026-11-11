import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const organizationA = await prisma.organization.upsert({
    where: { slug: "neirah-demo-a" },
    update: {},
    create: {
      name: "Neirah Demo A",
      slug: "neirah-demo-a"
    }
  });

  const organizationB = await prisma.organization.upsert({
    where: { slug: "neirah-demo-b" },
    update: {},
    create: {
      name: "Neirah Demo B",
      slug: "neirah-demo-b"
    }
  });

  async function getOrCreateClient(organizationId: string, name: string) {
    const existing = await prisma.client.findFirst({
      where: { organizationId, name }
    });

    if (existing) return existing;

    return prisma.client.create({
      data: {
        organizationId,
        name,
        contactEmail: `${name.toLowerCase().replace(/\s+/g, ".")}@example.test`
      }
    });
  }

  const clientA = await getOrCreateClient(organizationA.id, "Demo Client A");
  const clientB = await getOrCreateClient(organizationB.id, "Demo Client B");

  const accounts = [
    {
      name: "Admin A",
      email: "admin.a@example.test",
      role: UserRole.ORGANIZATION_ADMIN,
      organizationId: organizationA.id,
      clientId: null
    },
    {
      name: "Manager A",
      email: "manager.a@example.test",
      role: UserRole.MANAGER,
      organizationId: organizationA.id,
      clientId: null
    },
    {
      name: "Developer A",
      email: "developer.a@example.test",
      role: UserRole.DEVELOPER,
      organizationId: organizationA.id,
      clientId: null
    },
    {
      name: "Client User A",
      email: "client.a@example.test",
      role: UserRole.CLIENT_USER,
      organizationId: organizationA.id,
      clientId: clientA.id
    },
    {
      name: "Admin B",
      email: "admin.b@example.test",
      role: UserRole.ORGANIZATION_ADMIN,
      organizationId: organizationB.id,
      clientId: null
    },
    {
      name: "Client User B",
      email: "client.b@example.test",
      role: UserRole.CLIENT_USER,
      organizationId: organizationB.id,
      clientId: clientB.id
    }
  ];

  const credentials: { email: string; password: string; role: string }[] = [];

  for (const account of accounts) {
    const existing = await prisma.user.findUnique({
      where: { email: account.email }
    });

    if (existing) {
      await prisma.user.update({
        where: { email: account.email },
        data: {
          name: account.name,
          role: account.role,
          organizationId: account.organizationId,
          clientId: account.clientId
        }
      });

      console.log(`Existing demo account synchronized: ${account.email}`);
      continue;
    }

    const password = randomBytes(18).toString("base64url");
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        ...account,
        passwordHash
      }
    });

    credentials.push({
      email: account.email,
      password,
      role: account.role
    });
  }

  console.log("\nDemo organizations and clients are ready.");
  console.log("New development credentials (shown only once):");

  if (credentials.length === 0) {
    console.log("No new accounts were created. Existing passwords were preserved.");
  } else {
    console.table(credentials);
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });