import { NextResponse } from "next/server";
import { getCurrentPlan } from "@/lib/plans";

/**
 * 当前订阅计划（单用户模式）。
 *
 * - GET /api/plan
 * - 通过 APP_PLAN 环境变量模拟（FREE/PRO/MAX）
 */
export async function GET() {
  const plan = getCurrentPlan();
  return NextResponse.json({ plan });
}


