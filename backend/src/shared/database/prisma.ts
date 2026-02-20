import { PrismaClient } from '@prisma/client';

// In serverless environments (Vercel), each function invocation may create a new
// PrismaClient instance. We reuse the global instance across invocations in the
// same worker to avoid exhausting database connections.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
