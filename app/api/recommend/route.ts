import { NextRequest, NextResponse } from "next/server";
import { buildPantryFallback } from "./fallback";

const windows = new Map<string, { count: number; reset: number }>();

function fallbackResponse(pantry: string[], minutes: number, goal: string, reason: string) {
  return NextResponse.json({ recipes: buildPantryFallback(pantry, minutes, goal), source: "fallback", reason });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  const now = Date.now();
  const usage = windows.get(ip);
  const overLimit = Boolean(usage && usage.reset > now && usage.count >= 10);
  if (!overLimit) windows.set(ip, !usage || usage.reset <= now ? { count: 1, reset: now + 60 * 60 * 1000 } : { ...usage, count: usage.count + 1 });

  const body = await request.json().catch(() => null) as null | { pantry?: unknown; minutes?: unknown; goal?: unknown };
  const pantry = Array.isArray(body?.pantry) ? body.pantry.filter((x): x is string => typeof x === "string").slice(0, 24).map(x => x.slice(0, 30)) : [];
  const minutes = Math.min(90, Math.max(10, Number(body?.minutes) || 30));
  const goal = typeof body?.goal === "string" ? body.goal.slice(0, 20) : "灵感优先";
  if (!pantry.length) return NextResponse.json({ error: "请先添加至少一种食材。" }, { status: 400 });
  if (overLimit) return fallbackResponse(pantry, minutes, goal, "rate_limit");

  const key = process.env.GROQ_API_KEY;
  if (!key) return fallbackResponse(pantry, minutes, goal, "ai_not_configured");

  const schema = `{"recipes":[{"name":"菜名","emoji":"一个食物emoji","time":20,"cost":3.5,"protein":25,"description":"一句具体介绍","note":"一个替代建议或安全提示","ingredients":[{"name":"食材","amount":"具体用量","required":true}],"steps":["具体步骤1","具体步骤2","具体步骤3","具体步骤4"]}]}`;
  const prompt = `你是严谨的家庭主厨。根据用户现有食材设计恰好3道真正可执行、符合日常烹饪常识且彼此风格不同的菜。\n现有食材：${pantry.join("、")}\n期望时间：${minutes}分钟以内\n目标：${goal}\n要求：\n1. 只采用公认合理的经典搭配；宁可不使用某项食材，也绝不为了清空列表而硬凑组合。水果不得放进咸味炒菜，奶制品、海鲜和肉类必须遵守常见搭配。\n2. 如果输入不是食物、可能有毒、已变质或生食有风险，不得使用，并在note解释。\n3. 每道菜按普通家庭1至2人份列出全部食材和具体用量；基础油盐水可以列出但标为required=false。\n4. required=true仅用于缺了就无法完成的核心食材；点缀、升级风味和可替代调料标为false。\n5. 步骤清楚，包含关键火候与食品安全提醒。成本为美元估算，protein为每份蛋白质克数。\n6. 只返回合法JSON，不要Markdown。格式严格为：${schema}`;

  const attempts = [
    { model: "openai/gpt-oss-120b", reasoning_effort: "low", reasoning_format: "hidden" },
    { model: "openai/gpt-oss-20b", reasoning_effort: "low", reasoning_format: "hidden" },
  ];

  for (const attempt of attempts) {
    for (let retry = 0; retry < 2; retry += 1) try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          ...attempt,
          temperature: 0.6,
          max_completion_tokens: 3200,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 240).replace(/gsk_[A-Za-z0-9_-]+/g, "[redacted]");
        console.warn("Recipe model request failed", { model: attempt.model, status: response.status, detail });
        if ((response.status === 429 || response.status >= 500) && retry === 0) {
          const retryAfter = Number(response.headers.get("retry-after"));
          await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? Math.min(2000, Math.max(350, retryAfter * 1000)) : 500));
          continue;
        }
        break;
      }
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}") as { recipes?: unknown[] };
      if (!Array.isArray(parsed.recipes) || parsed.recipes.length < 3) {
        console.warn("Recipe model returned incomplete JSON", { model: attempt.model });
        break;
      }
      return NextResponse.json({ recipes: parsed.recipes.slice(0, 3), source: "ai" });
    } catch (error) {
      console.warn("Recipe model attempt failed", { model: attempt.model, reason: error instanceof Error ? error.message : "unknown" });
      if (retry === 0) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        continue;
      }
      break;
    }
  }

  return fallbackResponse(pantry, minutes, goal, "ai_service_unavailable");
}
