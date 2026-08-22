import { NextRequest, NextResponse } from "next/server";
import { buildPantryFallback } from "./fallback";

const windows = new Map<string, { count: number; reset: number }>();

type RecipeIngredient = { name: string; amount: string; required: boolean };
type ReliableRecipe = {
  name: string; emoji: string; time: number; cost: number; protein: number;
  description: string; note: string; ingredients: RecipeIngredient[]; steps: string[];
};

const normalizeFood = (value: string) => value.toLowerCase().replace(/[\s·・,，、()（）]/g, "");
const foodAliases = [
  ["鸡蛋", "鸭蛋", "蛋", "egg"], ["番茄", "西红柿", "圣女果", "tomato"],
  ["米饭", "剩饭", "大米", "rice"], ["面条", "挂面", "拉面", "乌冬", "方便面", "noodle"],
  ["鸡肉", "鸡胸", "鸡腿", "chicken"], ["牛肉", "牛排", "牛肉末", "beef"],
  ["猪肉", "猪排", "肉末", "pork"], ["土豆", "马铃薯", "potato"],
  ["豆腐", "豆干", "tofu"], ["蘑菇", "香菇", "口蘑", "菌菇", "mushroom"],
  ["青菜", "菠菜", "生菜", "白菜", "油菜", "小白菜", "leafygreens"],
  ["鱼", "三文鱼", "鳕鱼", "鲈鱼", "fish", "salmon"], ["虾", "大虾", "虾仁", "shrimp"],
  ["牛奶", "奶", "milk"], ["酸奶", "yogurt"], ["燕麦", "麦片", "oat"],
  ["意面", "意大利面", "pasta"], ["洋葱", "onion"], ["西兰花", "花椰菜", "broccoli"],
];
const fruitWords = ["香蕉", "苹果", "草莓", "蓝莓", "葡萄", "芒果", "西瓜", "梨", "桃", "橙", "橘", "猕猴桃"];
const savoryWords = ["鸡肉", "鸡胸", "鸡腿", "牛肉", "猪肉", "羊肉", "鱼", "虾", "蟹", "海鲜", "豆腐", "面条", "米饭"];
const suspiciousNames = ["大杂烩", "随机", "随便", "奇妙混搭", "创意拼盘", "清冰箱乱炖"];
const mainProteinGroups = [
  ["鸡肉", "鸡胸", "鸡腿", "chicken"], ["牛肉", "牛排", "牛肉末", "beef"],
  ["猪肉", "猪排", "肉末", "pork"], ["鱼", "三文鱼", "鳕鱼", "鲈鱼", "fish", "salmon"],
  ["虾", "大虾", "虾仁", "shrimp"],
];
const stapleGroups = [
  ["米饭", "剩饭", "大米", "rice"], ["面条", "挂面", "拉面", "乌冬", "方便面", "noodle"],
  ["意面", "意大利面", "pasta"], ["燕麦", "麦片", "oat"],
];

function includesAny(value: string, words: string[]) {
  const normalized = normalizeFood(value);
  return words.some((word) => normalized.includes(normalizeFood(word)));
}

function matchingPantryItem(name: string, pantry: string[]) {
  const normalized = normalizeFood(name);
  const aliases = foodAliases.find((group) => group.some((item) => normalized.includes(normalizeFood(item))));
  return pantry.find((item) => {
    const candidate = normalizeFood(item);
    return candidate.length > 0 && (
      normalized.includes(candidate) || candidate.includes(normalized) ||
      Boolean(aliases?.some((alias) => candidate.includes(normalizeFood(alias))))
    );
  });
}

const pantryMatch = (name: string, pantry: string[]) => Boolean(matchingPantryItem(name, pantry));
const groupCount = (names: string, groups: string[][]) => groups.filter((group) => includesAny(names, group)).length;

function ingredientAppearsInSteps(name: string, steps: string[]) {
  const aliases = foodAliases.find((group) => group.some((item) => normalizeFood(name).includes(normalizeFood(item))));
  return includesAny(steps.join(""), aliases || [name]);
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
  const matchedRequired = required.filter((item) => pantryMatch(item.name, pantry)).length;
  const missingRequired = required.length - matchedRequired;
  if (!required.length || required.length > 4 || matchedRequired === 0 || missingRequired > 1) return null;
  if (required.some((item) => /适量|若干|一些|少许/.test(item.amount))) return null;
  const allNames = safeIngredients.map((item) => item.name).join("、");
  if (includesAny(allNames, fruitWords) && includesAny(allNames, savoryWords)) return null;
  if (groupCount(required.map((item) => item.name).join("、"), mainProteinGroups) > 1) return null;
  if (groupCount(required.map((item) => item.name).join("、"), stapleGroups) > 1) return null;
  if (!required.every((item) => ingredientAppearsInSteps(item.name, value.steps as string[]))) return null;

  const pantryAlignedIngredients = safeIngredients.map((item) => {
    const matched = item.required ? matchingPantryItem(item.name, pantry) : undefined;
    return matched ? { ...item, name: matched } : item;
  });
  if (new Set(pantryAlignedIngredients.map((item) => normalizeFood(item.name))).size !== pantryAlignedIngredients.length) return null;

  const time = Number(value.time);
  const cost = Number(value.cost);
  const protein = Number(value.protein);
  if (!Number.isFinite(time) || time < 5 || time > Math.min(120, minutes + 5)) return null;
  if (!Number.isFinite(cost) || cost < 0 || cost > 100 || !Number.isFinite(protein) || protein < 0 || protein > 120) return null;
  if (typeof value.description !== "string" || typeof value.note !== "string") return null;

  return {
    name: value.name.slice(0, 40), emoji: typeof value.emoji === "string" ? value.emoji.slice(0, 8) : "🍽️",
    time, cost, protein, description: value.description.slice(0, 100), note: value.note.slice(0, 140),
    ingredients: pantryAlignedIngredients, steps: (value.steps as string[]).map((step) => step.slice(0, 180)),
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
  const prompt = `你是严谨的家庭主厨和菜谱审核员。根据用户现有食材推荐恰好3道真实存在、普通家庭能复现的菜。\n现有食材：${pantry.join("、")}\n期望时间：${minutes}分钟以内\n目标：${goal}\n要求：\n1. 每道菜先确定一个大众熟悉的菜名和成熟做法，再选食材；不要为了使用食材发明菜名。\n2. 每道菜只选味道相容的食材，不必用完用户输入。禁止大杂烩、猎奇融合、甜咸乱配和没有常见做法依据的组合；每道菜最多一个主要肉类或海鲜蛋白、一个主食体系。\n3. 每道菜需要1至4种核心食材（required=true），至少1种必须直接来自用户现有食材，且最多只能缺少1种核心食材。优先给出核心食材已经齐全的方案。油、盐、水、糖和普通调味料均标为required=false。\n4. 水果不得进入肉类、海鲜、豆腐、咸味面饭或咸味炒菜。无法确认是可食用食材、可能有毒、已变质或不适合该烹调方式的输入，不得使用。\n5. 三道菜采用不同主要做法。每一种required=true的食材都必须在步骤中明确出现并实际使用，步骤中也不得凭空出现未列出的核心食材。\n6. 按普通家庭1至2人份提供数字明确的用量；核心食材不得写“适量”“少许”或“若干”。步骤要包含火候、熟度和必要的食品安全提醒。\n7. 成本为美元估算，protein为每份蛋白质克数。输出前逐道自检，不合理就换成更经典、更简单的菜。\n8. 只返回合法JSON，不要Markdown。格式严格为：${schema}`;

  const attempts = [
    { model: "openai/gpt-oss-120b", reasoning_effort: "low", reasoning_format: "hidden" },
    { model: "openai/gpt-oss-20b", reasoning_effort: "low", reasoning_format: "hidden" },
  ];

  for (const attempt of attempts) {
    try {
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
        continue;
      }
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}") as { recipes?: unknown[] };
      const recipes = Array.isArray(parsed.recipes) ? parsed.recipes.map((recipe) => reliableRecipe(recipe, pantry, minutes)).filter((recipe): recipe is ReliableRecipe => recipe !== null) : [];
      const uniqueAi = recipes
        .filter((recipe, index) => recipes.findIndex((item) => item.name === recipe.name) === index)
        .sort((a, b) => a.ingredients.filter((item) => item.required && !pantryMatch(item.name, pantry)).length - b.ingredients.filter((item) => item.required && !pantryMatch(item.name, pantry)).length);
      const fallback = buildPantryFallback(pantry, minutes, goal);
      const combined = [...uniqueAi, ...fallback.filter((recipe) => !uniqueAi.some((item) => item.name === recipe.name))].slice(0, 3);
      if (combined.length) return NextResponse.json({ recipes: combined, source: uniqueAi.length >= 3 ? "ai" : "hybrid" });
      console.warn("Recipe model returned no plausible recipes", { model: attempt.model });
    } catch (error) {
      console.warn("Recipe model attempt failed", { model: attempt.model, reason: error instanceof Error ? error.message : "unknown" });
    }
  }

  return fallbackResponse(pantry, minutes, goal, "ai_service_unavailable");
}
