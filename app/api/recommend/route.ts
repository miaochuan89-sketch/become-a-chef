import { NextRequest, NextResponse } from "next/server";
import { buildPantryFallback } from "./fallback";

const windows = new Map<string, { count: number; reset: number }>();

type RecipeIngredient = { name: string; amount: string; required: boolean };
type ReliableRecipe = {
  name: string; emoji: string; time: number; cost: number; protein: number;
  description: string; note: string; ingredients: RecipeIngredient[]; steps: string[];
};

const normalizeFood = (value: string) => value.toLowerCase().replace(/[\s·・,，、()（）]/g, "");
const fruitWords = ["香蕉", "苹果", "草莓", "蓝莓", "葡萄", "芒果", "西瓜", "梨", "桃", "橙", "橘", "猕猴桃"];
const savoryWords = ["鸡肉", "鸡胸", "鸡腿", "牛肉", "猪肉", "羊肉", "鱼", "虾", "蟹", "海鲜", "豆腐", "面条", "米饭"];
const suspiciousNames = ["大杂烩", "随机", "随便", "奇妙混搭", "创意拼盘", "清冰箱乱炖"];

function includesAny(value: string, words: string[]) {
  const normalized = normalizeFood(value);
  return words.some((word) => normalized.includes(normalizeFood(word)));
}

function pantryMatch(name: string, pantry: string[]) {
  const normalized = normalizeFood(name);
  return pantry.some((item) => {
    const candidate = normalizeFood(item);
    return candidate.length > 0 && (normalized.includes(candidate) || candidate.includes(normalized));
  });
}

function reliableRecipe(raw: unknown, pantry: string[], minutes: number): ReliableRecipe | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.name !== "string" || value.name.length < 2 || value.name.length > 40 || suspiciousNames.some((word) => value.name!.toString().includes(word))) return null;
  if (!Array.isArray(value.ingredients) || value.ingredients.length < 2 || value.ingredients.length > 10) return null;
  if (!Array.isArray(value.steps) || value.steps.length < 3 || value.steps.length > 8 || !value.steps.every((step) => typeof step === "string" && step.length >= 4)) return null;

  const ingredients = value.ingredients.map((item) => {
    if (!item || typeof item !== "object") return null;
    const entry = item as Record<string, unknown>;
    if (typeof entry.name !== "string" || !entry.name.trim() || typeof entry.amount !== "string" || !entry.amount.trim()) return null;
    return { name: entry.name.slice(0, 30), amount: entry.amount.slice(0, 30), required: entry.required === true };
  });
  if (ingredients.some((item) => item === null)) return null;
  const safeIngredients = ingredients as RecipeIngredient[];
  const required = safeIngredients.filter((item) => item.required);
  if (!required.length || required.length > 6 || !safeIngredients.some((item) => pantryMatch(item.name, pantry))) return null;
  if (new Set(safeIngredients.map((item) => normalizeFood(item.name))).size !== safeIngredients.length) return null;
  const requiredNames = required.map((item) => item.name).join("、");
  if (includesAny(requiredNames, fruitWords) && includesAny(requiredNames, savoryWords)) return null;

  const time = Number(value.time);
  const cost = Number(value.cost);
  const protein = Number(value.protein);
  if (!Number.isFinite(time) || time < 5 || time > Math.min(120, minutes + 5)) return null;
  if (!Number.isFinite(cost) || cost < 0 || cost > 100 || !Number.isFinite(protein) || protein < 0 || protein > 120) return null;
  if (typeof value.description !== "string" || typeof value.note !== "string") return null;

  return {
    name: value.name.slice(0, 40), emoji: typeof value.emoji === "string" ? value.emoji.slice(0, 8) : "🍽️",
    time, cost, protein, description: value.description.slice(0, 100), note: value.note.slice(0, 140),
    ingredients: safeIngredients, steps: (value.steps as string[]).map((step) => step.slice(0, 180)),
  };
}

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
  const prompt = `你是严谨的家庭主厨。根据用户现有食材设计恰好3道真正可执行、符合日常烹饪常识且彼此风格不同的菜。\n现有食材：${pantry.join("、")}\n期望时间：${minutes}分钟以内\n目标：${goal}\n要求：\n1. 先选择一个成熟的菜式模板（快炒、汤面、盖饭、炖菜、煎烤、沙拉或早餐碗），再挑选最多2至3种味道相容的现有食材。\n2. 只采用公认合理的家常搭配；宁可不用某项食材，也绝不把全部食材塞进同一道菜。不得创造大杂烩、猎奇融合菜或没有常见做法支撑的组合。\n3. 水果不得进入肉类、海鲜、豆腐、咸味面饭或咸味炒菜；输入不是食物、可能有毒、已变质或生食有风险时不得使用。\n4. 三道菜要采用不同的主要烹调方式，每道至少直接使用一种用户现有食材，并优先给出大众熟悉、有明确菜名的做法。\n5. 每道菜按普通家庭1至2人份列出全部食材和具体用量；基础油盐水可以列出但标为required=false。required=true只用于核心食材。\n6. 步骤清楚，包含关键火候与食品安全提醒。成本为美元估算，protein为每份蛋白质克数。\n7. 只返回合法JSON，不要Markdown。格式严格为：${schema}`;

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
          temperature: 0.2,
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
      const recipes = Array.isArray(parsed.recipes) ? parsed.recipes.map((recipe) => reliableRecipe(recipe, pantry, minutes)).filter((recipe): recipe is ReliableRecipe => recipe !== null) : [];
      if (recipes.length < 3 || new Set(recipes.map((recipe) => recipe.name)).size < 3) {
        console.warn("Recipe model returned incomplete or implausible recipes", { model: attempt.model, accepted: recipes.length });
        break;
      }
      return NextResponse.json({ recipes: recipes.slice(0, 3), source: "ai" });
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
