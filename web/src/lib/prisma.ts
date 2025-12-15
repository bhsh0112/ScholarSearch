import { PrismaClient } from "@prisma/client";

/**
 * 全局 PrismaClient（用于 Next.js dev 热重载避免连接数爆炸）
 * @see https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
 */
declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * 获取 PrismaClient 单例。
 */
export const prisma: PrismaClient = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}


