/**
 * Dentalo – Prisma Client with Tenant Isolation Extension
 *
 * Provides:
 *   • `prisma`           – base PrismaClient singleton (for migrations, seeding, super-admin)
 *   • `adminClient`      – same singleton, explicitly named for super-admin operations
 *   • `getTenantClient`  – returns an extended client that automatically scopes all
 *                          reads and writes to the given companyId for tenant-scoped models
 *   • `TENANT_SCOPED_MODELS` – list of model names that are tenant-scoped
 */

import { PrismaClient, Prisma } from "@prisma/client";

// ─── Singleton ───────────────────────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Raw admin client for super-admin operations that do NOT need tenant scoping.
 * ⚠️  Must never be used to query clinical tables (Patient, Visit, etc.)
 *     without an explicit companyId filter.
 */
export const adminClient = prisma;

// ─── Tenant-scoped models ────────────────────────────────────────────────────

/**
 * Models that carry a `companyId` foreign key and must always be scoped
 * to the current tenant context.
 */
export const TENANT_SCOPED_MODELS = [
  "patient",
  "appointment",
  "visit",
  "treatmentRecord",
  "invitation",
  "staffProfile", // accessed via membership, but membership is tenant-scoped
  "companyMembership",
  "supportSession",
  "auditLog",
] as const;

export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

/** Set of tenant-scoped model names for O(1) lookup. */
const tenantScopedSet: ReadonlySet<string> = new Set<string>(
  TENANT_SCOPED_MODELS,
);

// ─── Tenant-scoped Prisma extension ──────────────────────────────────────────

/**
 * Returns an extended PrismaClient that automatically:
 *   • Injects `companyId` on every `create` for tenant-scoped models
 *   • Adds `companyId` filter on every `findMany`, `findFirst`, `findUnique`,
 *     `update`, `updateMany`, `delete`, `deleteMany`, `count`, `aggregate`
 *     for tenant-scoped models
 *
 * @param companyId – the tenant (company) identifier
 *
 * @example
 * ```ts
 * const db = getTenantClient("company_abc123");
 * const patients = await db.patient.findMany(); // automatically WHERE companyId = 'company_abc123'
 * ```
 */
export function getTenantClient(companyId: string) {
  return prisma.$extends({
    name: "tenantIsolation",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (tenantScopedSet.has(model)) {
            args.where = { ...args.where, companyId };
          }
          return query(args);
        },

        async findFirst({ model, args, query }) {
          if (tenantScopedSet.has(model)) {
            args.where = { ...args.where, companyId };
          }
          return query(args);
        },

        async findUnique({ model, args, query }) {
          if (tenantScopedSet.has(model)) {
            // findUnique only accepts unique fields in `where`, so we
            // re-route through findFirst to add the companyId guard.
            // This trades a marginal perf cost for guaranteed isolation.
            const modelDelegate = (prisma as any)[model];
            if (modelDelegate && typeof modelDelegate.findFirst === 'function') {
              return await modelDelegate.findFirst({
                ...args,
                where: { ...args.where, companyId },
              });
            }
          }
          return query(args);
        },

        async create({ model, args, query }) {
          if (tenantScopedSet.has(model)) {
            (args.data as any).companyId = companyId;
          }
          return query(args);
        },

        async createMany({ model, args, query }) {
          if (tenantScopedSet.has(model)) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((d: any) => ({
                ...d,
                companyId,
              }));
            } else {
              (args.data as any).companyId = companyId;
            }
          }
          return query(args);
        },

        async update({ model, args, query }) {
          if (tenantScopedSet.has(model)) {
            args.where = { ...args.where, companyId } as any;
          }
          return query(args);
        },

        async updateMany({ model, args, query }) {
          if (tenantScopedSet.has(model)) {
            args.where = { ...args.where, companyId };
          }
          return query(args);
        },

        async delete({ model, args, query }) {
          if (tenantScopedSet.has(model)) {
            args.where = { ...args.where, companyId } as any;
          }
          return query(args);
        },

        async deleteMany({ model, args, query }) {
          if (tenantScopedSet.has(model)) {
            args.where = { ...args.where, companyId };
          }
          return query(args);
        },

        async count({ model, args, query }) {
          if (tenantScopedSet.has(model)) {
            args.where = { ...args.where, companyId };
          }
          return query(args);
        },

        async aggregate({ model, args, query }) {
          if (tenantScopedSet.has(model)) {
            args.where = { ...args.where, companyId };
          }
          return query(args);
        },
      },
    },
  });
}

/** Convenience type for the tenant-scoped client. */
export type TenantClient = ReturnType<typeof getTenantClient>;
