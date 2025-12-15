import { AiExpandResultSchema, type AiExpandResult } from "@/lib/ai/schema";

/**
 * 从模型输出文本中提取 JSON（容错处理）：
 * - 支持 ```json ... ``` / ``` ... ``` 代码块
 * - 支持在解释文字中夹带 JSON：截取从第一个 '{' 到最后一个 '}' 的子串
 */
function parseJsonFromModelText(text: string): unknown {
  const trimmed = text.trim();

  // 1) 优先处理 markdown 代码块
  const fenceMatch =
    trimmed.match(/```json\s*([\s\S]*?)\s*```/i) ??
    trimmed.match(/```\s*([\s\S]*?)\s*```/);
  if (fenceMatch?.[1]) {
    const inside = fenceMatch[1].trim();
    return JSON.parse(inside);
  }

  // 2) 再尝试直接 parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // ignore
  }

  // 3) 最后尝试截取 JSON 子串
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const slice = trimmed.slice(first, last + 1);
    return JSON.parse(slice);
  }

  throw new Error("LLM returned non-JSON content");
}

/**
 * OpenAI-compatible Chat Completions 请求参数（最小子集）。
 */
type ChatCompletionRequest = {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature?: number;
  response_format?: { type: "json_object" };
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

/**
 * 调用第三方 LLM，将自由表述扩展为：
 * - queryDraft：可编辑的检索式草案
 * - filters：结构化过滤条件（可选）
 *
 * 设计原则：
 * - 若未配置 LLM 环境变量，则返回 null（前端可回退为手动输入）
 * - 严格要求 JSON 输出，并用 zod 校验
 */
export async function aiExpandQuery(params: {
  query: string;
  userContext?: string | null;
}): Promise<AiExpandResult | null> {
  const baseUrl = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!baseUrl || !apiKey || !model) return null;

  const system = [
    "你是一个学术检索助手，任务是把用户的自由表述转成“可编辑的检索草案（关键词串风格）+ 结构化 filters”。",
    "",
    "输出格式要求：只输出 JSON（不要 Markdown），并严格符合字段：",
    "- queryDraft: string",
    "- filters?: { sources?: [OPENALEX|CROSSREF|ARXIV][], yearFrom?: number, yearTo?: number, venues?: string[], authors?: string[] }",
    "- keywords?: string[]（可选）",
    "- mustNot?: string[]（可选：排除词建议）",
    "- rationale?: string（可选：不超过 600 字）",
    "",
    "queryDraft 风格（非常重要）：",
    "- 采用“关键词串风格”：用空格分隔关键词，用引号包裹关键短语，例如：graph neural network GNN \"graph representation learning\" survey",
    "- 不要使用括号、复杂布尔表达式、字段限定（如 title:、author:）、以及过长的自然语言句子。",
    "- 重点补全同义词/缩写/常见写法变体，但不要臆造专有名词。",
    "- 长度建议 6~20 个 token，尽量紧凑。",
    "",
    "filters 的原则：",
    "- 仅在用户明确提到年份/作者/会议期刊/来源时才填；不要臆造。",
    "- 优先把“年份/作者/venue/来源”放进 filters，而不是塞进 queryDraft。",
  ].join("\n");

  const user = [
    `用户输入：${params.query}`,
    params.userContext ? `上下文（可选）：${params.userContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const body: ChatCompletionRequest = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  };

  const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`LLM error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ChatCompletionResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM empty content");

  const parsed = parseJsonFromModelText(content);

  const out = AiExpandResultSchema.safeParse(parsed);
  if (!out.success) {
    throw new Error("LLM JSON schema mismatch");
  }
  return out.data;
}


