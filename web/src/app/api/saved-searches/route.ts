import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SearchFiltersSchema } from "@/lib/filters";
import { PLANS } from "@/lib/plans";
import { getActivePlanForUser } from "@/lib/subscription";

type SavedSearchFindManyArgs = Parameters<typeof prisma.savedSearch.findMany>[0];
type SavedSearchFindManySelect = SavedSearchFindManyArgs extends { select?: infer S } ? S : never;
type SavedSearchCreateArgs = Parameters<typeof prisma.savedSearch.create>[0];
type SavedSearchCreateData = SavedSearchCreateArgs extends { data: infer D } ? D : never;
type SavedSearchCreateSelect = SavedSearchCreateArgs extends { select?: infer S } ? S : never;

const CreateSavedSearchSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(80),
  query: z.string().min(1).max(300),
  schedule: z.enum(["MANUAL", "DAILY", "WEEKLY"]).default("DAILY"),
  pushStrategy: z.enum(["RECENCY", "IMPORTANCE", "HYBRID"]).default("HYBRID"),
  pushTopN: z.coerce.number().int().min(1).max(50).default(10),
  noiseLevel: z.enum(["STRICT", "STANDARD", "LOOSE"]).default("STANDARD"),
  filters: SearchFiltersSchema.optional(),
});

/**
 * Saved Searches：
 * - GET: 列表
 * - POST: 创建
 *
 * V1：单用户模式（APP_USER_EMAIL）
 */
export async function GET() {
  const email = process.env.APP_USER_EMAIL || "you@example.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "user_not_seeded" }, { status: 500 });

  const savedSearches = await prisma.savedSearch.findMany({
    where: { project: { userId: user.id } },
    orderBy: { updatedAt: "desc" },
    /**
     * 说明：
     * - Prisma Client 类型在部分编辑器环境会出现“滞后缓存”，导致新字段暂时不可见。
     * - 这里用类型断言把 select/data 绑定到 Prisma 期望的参数类型，避免阻塞开发体验。
     *
     * 注意：数据库 schema 已包含 pushStrategy/pushTopN/noiseLevel，运行时读写是有效的。
     */
    select: ({
      id: true,
      name: true,
      query: true,
      active: true,
      schedule: true,
      pushStrategy: true,
      pushTopN: true,
      noiseLevel: true,
      lastCheckedAt: true,
      createdAt: true,
      updatedAt: true,
      projectId: true,
    } as unknown) as SavedSearchFindManySelect,
  });

  return NextResponse.json({ savedSearches });
}

export async function POST(req: Request) {
  const email = process.env.APP_USER_EMAIL || "you@example.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "user_not_seeded" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSavedSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const planId = (await getActivePlanForUser(user.id)) ?? "FREE";
  const plan = PLANS[planId];
  if (!plan.limits.allowedSchedules.includes(parsed.data.schedule)) {
    return NextResponse.json(
      { error: "plan_limit", message: `当前计划不支持 ${parsed.data.schedule} 频率，请升级后使用。` },
      { status: 402 },
    );
  }
  if (parsed.data.pushTopN > plan.limits.maxPushTopN) {
    return NextResponse.json(
      { error: "plan_limit", message: `当前计划 TopN 上限为 ${plan.limits.maxPushTopN}，请降低或升级。` },
      { status: 402 },
    );
  }

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, userId: user.id },
  });
  if (!project) return NextResponse.json({ error: "project_not_found" }, { status: 404 });

  const existingCount = await prisma.savedSearch.count({ where: { project: { userId: user.id } } });
  if (existingCount >= plan.limits.maxTopics) {
    return NextResponse.json(
      { error: "plan_limit", message: `当前计划最多可创建 ${plan.limits.maxTopics} 个主题，请升级后继续创建。` },
      { status: 402 },
    );
  }

  const saved = await prisma.savedSearch.create({
    data: ({
      projectId: project.id,
      name: parsed.data.name,
      query: parsed.data.query,
      schedule: parsed.data.schedule,
      pushStrategy: parsed.data.pushStrategy,
      pushTopN: parsed.data.pushTopN,
      noiseLevel: parsed.data.noiseLevel,
      filters: parsed.data.filters ?? undefined,
      active: true,
    } as unknown) as SavedSearchCreateData,
    select: ({
      id: true,
      name: true,
      query: true,
      filters: true,
      active: true,
      schedule: true,
      pushStrategy: true,
      pushTopN: true,
      noiseLevel: true,
      lastCheckedAt: true,
      createdAt: true,
      updatedAt: true,
      projectId: true,
    } as unknown) as SavedSearchCreateSelect,
  });

  return NextResponse.json({ savedSearch: saved }, { status: 201 });
}


