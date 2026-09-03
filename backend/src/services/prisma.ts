// backend/src/services/prisma.ts
// ⚠️ يجب أن يبقى استيراد config/env أولاً: هو من يضبط DATABASE_URL
// من متغيرات إضافات Heroku قبل إنشاء عميل Prisma.
import '../config/env';
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;