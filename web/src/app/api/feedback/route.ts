import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const FeedbackSchema = z.object({
  savedSearchId: z.string().min(1),
  workId: z.string().min(1),
  action: z.enum(["RELEVANT", "NOT_RELEVANT", "MORE_LIKE_THIS", "LESS_LIKE_THIS"]),
});

/**
 * 反馈 API（V1.5）：
 * - POST /api/feedback
 *
 * 说明：
 * - 单用户模式：使用 APP_USER_EMAIL
 * - 记录“主题-论文”级别的反馈（WorkFeedback）
 * - 同时把反馈折算为“主题偏好”（TopicPreference）权重，用于后续规则版排序增益
 */
export async function POST(req: Request) {
  const me = await requireUser(req);

  const body = await req.json().catch(() => ({}));
  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const { savedSearchId, workId, action } = parsed.data;

  // 校验 savedSearch 属于当前用户
  const ss = await prisma.savedSearch.findFirst({
    where: { id: savedSearchId, project: { userId: me.id } },
    select: { id: true },
  });
  if (!ss) return NextResponse.json({ error: "saved_search_not_found" }, { status: 404 });

  // 拉取 work 的可用于偏好学习的信息
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: { id: true, venue: true, authors: true },
  });
  if (!work) return NextResponse.json({ error: "work_not_found" }, { status: 404 });

  await prisma.workFeedback.upsert({
    where: { userId_savedSearchId_workId: { userId: me.id, savedSearchId, workId } },
    update: { action },
    create: { userId: me.id, savedSearchId, workId, action },
  });

  /**
   * 偏好更新规则（简单且可解释）：
   * - MORE_LIKE_THIS：+2
   * - RELEVANT：+1
   * - LESS_LIKE_THIS：-2
   * - NOT_RELEVANT：-3
   */
  const delta =
    action === "MORE_LIKE_THIS" ? 2 : action === "RELEVANT" ? 1 : action === "LESS_LIKE_THIS" ? -2 : -3;

  const venue = work.venue?.trim();
  const authors = Array.isArray(work.authors) ? (work.authors as Array<{ name?: unknown }>) : [];
  const authorNames = authors
    .map((a) => (typeof a?.name === "string" ? a.name.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);

  const ops: Array<Promise<unknown>> = [];

  if (venue) {
    ops.push(
      prisma.topicPreference.upsert({
        where: { userId_savedSearchId_kind_value: { userId: me.id, savedSearchId, kind: "VENUE", value: venue } },
        update: { weight: { increment: delta } },
        create: { userId: me.id, savedSearchId, kind: "VENUE", value: venue, weight: delta },
      }),
    );
  }

  for (const name of authorNames) {
    ops.push(
      prisma.topicPreference.upsert({
        where: { userId_savedSearchId_kind_value: { userId: me.id, savedSearchId, kind: "AUTHOR", value: name } },
        update: { weight: { increment: delta } },
        create: { userId: me.id, savedSearchId, kind: "AUTHOR", value: name, weight: delta },
      }),
    );
  }

  await Promise.all(ops);

  return NextResponse.json({ ok: true });
}


