export type PlanId = "FREE" | "PRO" | "MAX";

export type PlanLimits = {
  /** 主题数量上限（SavedSearch 数） */
  maxTopics: number;
  /** 每次推送 TopN 上限 */
  maxPushTopN: number;
  /** 是否允许使用 AI 生成检索草案 */
  aiEnabled: boolean;
  /** 是否允许邮件通知（需要 SMTP 配置） */
  emailEnabled: boolean;
  /** 允许的追踪频率 */
  allowedSchedules: Array<"MANUAL" | "DAILY" | "WEEKLY">;
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  tagline: string;
  /** 定价（国内展示用，实际支付接入后再替换） */
  pricing: {
    monthlyCny: number;
    yearlyCny: number;
  };
  limits: PlanLimits;
  highlights: string[];
};

/**
 * 订阅计划（产品化雏形）。
 *
 * 说明：
 * - 先用 APP_PLAN 环境变量模拟用户当前计划（单用户模式）
 * - 后续接入真实支付/账户体系时，再把 plan 与 user 绑定
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    tagline: "体验版：能搜能存，推送弱一些",
    pricing: { monthlyCny: 0, yearlyCny: 0 },
    limits: {
      maxTopics: 3,
      maxPushTopN: 5,
      aiEnabled: false,
      emailEnabled: false,
      allowedSchedules: ["MANUAL", "WEEKLY"],
    },
    highlights: ["聚合检索（OpenAlex/Crossref/arXiv）", "基础过滤与去重合并", "最多 3 个主题（每周/手动）"],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    tagline: "个人研究者：日常推送 + 可控反馈",
    pricing: { monthlyCny: 69, yearlyCny: 599 },
    limits: {
      maxTopics: 30,
      maxPushTopN: 20,
      aiEnabled: true,
      emailEnabled: true,
      allowedSchedules: ["MANUAL", "DAILY", "WEEKLY"],
    },
    highlights: ["每日/每周推送可选", "Top 20 推送 + 噪音控制", "反馈闭环（越用越准）", "AI 生成检索草案"],
  },
  MAX: {
    id: "MAX",
    name: "Max",
    tagline: "重度调研/产业研究：更多主题、更强推送",
    pricing: { monthlyCny: 149, yearlyCny: 1299 },
    limits: {
      maxTopics: 120,
      maxPushTopN: 50,
      aiEnabled: true,
      emailEnabled: true,
      allowedSchedules: ["MANUAL", "DAILY", "WEEKLY"],
    },
    highlights: ["更多主题与更高推送上限", "重要性优先/混合更适合信息管理", "更适合持续跟踪多个赛道/竞品方向"],
  },
};

/**
 * 获取当前计划（单用户模式）。
 */
export function getCurrentPlanId(): PlanId {
  const raw = (process.env.APP_PLAN || "FREE").toUpperCase();
  if (raw === "PRO" || raw === "MAX" || raw === "FREE") return raw;
  return "FREE";
}

/**
 * 获取当前计划定义。
 */
export function getCurrentPlan(): PlanDefinition {
  return PLANS[getCurrentPlanId()];
}


