import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SearchFiltersSchema } from "@/lib/filters";

const CreateSavedSearchSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(80),
  query: z.string().min(1).max(300),
  schedule: z.enum(["MANUAL", "DAILY", "WEEKLY"]).default("DAILY"),
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
    select: {
      id: true,
      name: true,
      query: true,
      active: true,
      schedule: true,
      lastCheckedAt: true,
      createdAt: true,
      updatedAt: true,
      projectId: true,
    },
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

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, userId: user.id },
  });
  if (!project) return NextResponse.json({ error: "project_not_found" }, { status: 404 });

  const saved = await prisma.savedSearch.create({
    data: {
      projectId: project.id,
      name: parsed.data.name,
      query: parsed.data.query,
      schedule: parsed.data.schedule,
      filters: parsed.data.filters ?? null,
      active: true,
    },
    select: {
      id: true,
      name: true,
      query: true,
      filters: true,
      active: true,
      schedule: true,
      lastCheckedAt: true,
      createdAt: true,
      updatedAt: true,
      projectId: true,
    },
  });

  return NextResponse.json({ savedSearch: saved }, { status: 201 });
}


