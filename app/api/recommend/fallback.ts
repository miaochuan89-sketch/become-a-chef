export type FallbackRecipe = {
  name: string;
  emoji: string;
  time: number;
  cost: number;
  protein: number;
  description: string;
  note: string;
  ingredients: Array<{ name: string; amount: string; required: boolean }>;
  steps: string[];
  source: "fallback";
};

type Candidate = FallbackRecipe & { matchGroups: string[][] };

const findPantryItem = (pantry: string[], aliases: string[]) => pantry.find((item) => {
  const normalized = item.toLowerCase().replace(/\s+/g, "");
  return aliases.some((alias) => normalized.includes(alias));
});

const ingredient = (pantry: string[], label: string, aliases: string[], amount: string, required = true) => ({
  name: findPantryItem(pantry, aliases) || label,
  amount,
  required,
});

const optional = (name: string, amount = "少许") => ({ name, amount, required: false });

export function buildPantryFallback(pantry: string[], minutes: number, goal: string): FallbackRecipe[] {
  const tomato = ["番茄", "西红柿", "圣女果"];
  const egg = ["鸡蛋", "鸭蛋", "蛋"];
  const rice = ["米饭", "剩饭", "大米"];
  const noodles = ["面条", "挂面", "拉面", "乌冬", "方便面"];
  const pasta = ["意面", "意大利面"];
  const chicken = ["鸡肉", "鸡胸", "鸡腿"];
  const beef = ["牛肉", "牛排", "牛肉末"];
  const potato = ["土豆", "马铃薯"];
  const tofu = ["豆腐", "豆干"];
  const mushroom = ["蘑菇", "香菇", "口蘑", "菌菇", "金针菇"];
  const onion = ["洋葱"];
  const leafy = ["菠菜", "青菜", "生菜", "小白菜", "油菜", "白菜", "菜心"];
  const fish = ["鱼", "三文鱼", "鳕鱼", "鲈鱼"];
  const oats = ["燕麦", "麦片"];
  const dairy = ["牛奶", "酸奶"];
  const fruit = ["香蕉", "苹果", "蓝莓", "草莓"];
  const vegetables = [...leafy, "西兰花", "花椰菜", "胡萝卜", "青椒", "彩椒", "芦笋", "西葫芦", "茄子"];
  const chosenVegetable = findPantryItem(pantry, vegetables) || "西兰花";

  const candidates: Candidate[] = [
    {
      name: "番茄炒蛋", emoji: "🍅", time: 15, cost: 2.5, protein: 18,
      description: "酸甜番茄配嫩鸡蛋，是经过验证的经典家常搭配。",
      note: "鸡蛋炒到刚凝固就先盛出，回锅后不要久炒。",
      ingredients: [ingredient(pantry, "番茄", tomato, "2个"), ingredient(pantry, "鸡蛋", egg, "3个"), optional("食用油"), optional("盐和糖")],
      steps: ["番茄切块，鸡蛋加少许盐打散。", "热锅放油，把鸡蛋炒至刚凝固后盛出。", "原锅炒软番茄，加少许盐和糖。", "倒回鸡蛋快速翻匀后关火。"],
      source: "fallback", matchGroups: [tomato, egg],
    },
    {
      name: "青菜鸡蛋汤面", emoji: "🍜", time: 15, cost: 2.8, protein: 17,
      description: "面条、鸡蛋与绿叶菜组成清爽而完整的一餐。",
      note: "绿叶菜最后放；蛋液下锅后等几秒再搅动。",
      ingredients: [ingredient(pantry, "面条", noodles, "160克"), ingredient(pantry, "鸡蛋", egg, "2个"), ingredient(pantry, "绿叶菜", leafy, "一把"), optional("酱油和香油")],
      steps: ["水烧开后放入面条。", "面条接近熟时加入洗净的绿叶菜。", "沿锅边淋入蛋液，稍等后轻轻搅动。", "用少量酱油、盐和香油调味。"],
      source: "fallback", matchGroups: [noodles, egg, leafy],
    },
    {
      name: "黄金蛋炒饭", emoji: "🍳", time: 12, cost: 2.2, protein: 16,
      description: "剩米饭和鸡蛋的可靠组合，配菜只作可选升级。",
      note: "冷米饭更容易炒散；配菜味道不合适时不要勉强加入。",
      ingredients: [ingredient(pantry, "米饭", rice, "2碗"), ingredient(pantry, "鸡蛋", egg, "2个"), optional("葱花"), optional("酱油")],
      steps: ["把米饭抓散，鸡蛋打匀。", "锅中放油先炒鸡蛋，凝固后推到一边。", "加入米饭大火翻炒至松散。", "少量加盐或酱油，炒干水汽即可。"],
      source: "fallback", matchGroups: [rice, egg],
    },
    {
      name: "家常鸡肉炖土豆", emoji: "🍲", time: 35, cost: 6, protein: 34,
      description: "鸡肉与土豆耐炖又相互入味，不使用无关食材凑组合。",
      note: "鸡肉中心必须完全熟透；土豆切小块可缩短时间。",
      ingredients: [ingredient(pantry, "鸡肉", chicken, "300克"), ingredient(pantry, "土豆", potato, "2个"), optional("洋葱", "半个"), optional("酱油")],
      steps: ["鸡肉和土豆分别切块，生熟砧板分开。", "鸡肉先煎至表面变色。", "加入土豆、酱油和热水，小火炖至土豆软烂。", "确认鸡肉熟透后收汁调味。"],
      source: "fallback", matchGroups: [chicken, potato],
    },
    {
      name: "豆腐菌菇煲", emoji: "🍄", time: 25, cost: 4, protein: 22,
      description: "豆腐吸收菌菇鲜味，是温和而常见的植物蛋白搭配。",
      note: "豆腐先煎定型更不易碎，菌菇必须充分加热。",
      ingredients: [ingredient(pantry, "豆腐", tofu, "1盒"), ingredient(pantry, "菌菇", mushroom, "200克"), optional("青菜", "一把"), optional("酱油")],
      steps: ["豆腐切块擦干，菌菇清理干净。", "少油把豆腐两面煎至金黄。", "加入菌菇翻炒，再加小半碗水和酱油。", "小火焖十分钟，可在最后加入青菜。"],
      source: "fallback", matchGroups: [tofu, mushroom],
    },
    {
      name: "洋葱炒牛肉", emoji: "🥩", time: 20, cost: 7, protein: 36,
      description: "洋葱的甜味能平衡牛肉，是简单稳定的快炒组合。",
      note: "牛肉逆纹切薄片并分批快炒，避免出水变老。",
      ingredients: [ingredient(pantry, "牛肉", beef, "250克"), ingredient(pantry, "洋葱", onion, "1个"), optional("黑胡椒"), optional("酱油")],
      steps: ["牛肉逆纹切薄片，洋葱切丝。", "热锅分批把牛肉炒至变色，先盛出。", "原锅炒软洋葱。", "牛肉回锅，加少量酱油和黑胡椒快速翻匀。"],
      source: "fallback", matchGroups: [beef, onion],
    },
    {
      name: `蒜香清炒${chosenVegetable}`, emoji: "🥬", time: 12, cost: 2.5, protein: 6,
      description: `只突出${chosenVegetable}本身，不与味道不确定的食材强行混炒。`,
      note: "不同蔬菜熟成时间不同：根茎先下锅，叶菜快速翻炒。",
      ingredients: [{ name: chosenVegetable, amount: "300克", required: true }, optional("蒜", "2瓣"), optional("食用油和盐")],
      steps: ["蔬菜洗净沥干，切成均匀大小。", "热锅少油，先炒香蒜末。", "放入蔬菜大火翻炒；太干可沿锅边加一勺水。", "刚熟时加盐并立即关火。"],
      source: "fallback", matchGroups: [vegetables],
    },
    {
      name: "奶香蘑菇意面", emoji: "🍝", time: 25, cost: 5, protein: 20,
      description: "意面和菌菇是稳定搭配，牛奶只用于补充柔和酱汁。",
      note: "牛奶用小火加热，不要长时间沸腾。",
      ingredients: [ingredient(pantry, "意面", pasta, "180克"), ingredient(pantry, "蘑菇", mushroom, "180克"), ingredient(pantry, "牛奶", dairy, "150毫升", false), optional("黑胡椒")],
      steps: ["意面按包装说明煮熟，保留半杯面汤。", "蘑菇切片后炒至微微焦黄。", "转小火加入牛奶和少量面汤。", "放入意面拌匀，用盐和黑胡椒调味。"],
      source: "fallback", matchGroups: [pasta, mushroom, dairy],
    },
    {
      name: "水果燕麦早餐碗", emoji: "🥣", time: 8, cost: 3, protein: 12,
      description: "水果只与燕麦和奶制品搭配，不会被放进咸味炒菜。",
      note: "只使用新鲜水果；对乳制品不耐受时可用水煮燕麦。",
      ingredients: [ingredient(pantry, "燕麦", oats, "80克"), ingredient(pantry, "牛奶或酸奶", dairy, "200毫升"), ingredient(pantry, "水果", fruit, "1份", false)],
      steps: ["燕麦与牛奶或清水小火煮至软稠。", "水果洗净并切成适口大小。", "燕麦稍放凉后装碗。", "把水果铺在表面，不与咸味食材混合。"],
      source: "fallback", matchGroups: [oats, dairy, fruit],
    },
    {
      name: "香煎鱼配清炒时蔬", emoji: "🐟", time: 22, cost: 7, protein: 32,
      description: "鱼和蔬菜分别烹熟后同盘，味道清楚也更安全。",
      note: "鱼肉最厚处应完全熟透；与蔬菜使用不同的夹子和砧板。",
      ingredients: [ingredient(pantry, "鱼", fish, "2片"), { name: chosenVegetable, amount: "250克", required: true }, optional("柠檬或黑胡椒")],
      steps: ["鱼擦干后加少许盐，蔬菜洗净切好。", "平底锅少油把鱼两面煎熟，先盛出。", "换干净夹子，原锅快速炒熟蔬菜。", "鱼和蔬菜分区装盘，按喜好加黑胡椒。"],
      source: "fallback", matchGroups: [fish, vegetables],
    },
  ];

  return candidates
    .map((recipe) => {
      const matched = recipe.matchGroups.filter((group) => findPantryItem(pantry, group)).length;
      const missing = recipe.matchGroups.length - matched;
      let score = matched * 14 - missing * 4 - Math.max(0, recipe.time - minutes);
      if (goal === "清空冰箱") score += matched * 5;
      if (goal === "高蛋白") score += recipe.protein / 5;
      return { recipe, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ recipe }) => {
      const { matchGroups: _matchGroups, ...publicRecipe } = recipe;
      void _matchGroups;
      return publicRecipe;
    });
}
