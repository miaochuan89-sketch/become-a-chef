import assert from "node:assert/strict";
import test from "node:test";

async function request(path = "/", init) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, init),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Become a Chef product shell", async () => {
  const response = await request("/", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>BECOME A CHEF<\/title>/i);
  assert.match(html, /BECOME A CHEF/);
  assert.match(html, /Make something/);
  assert.match(html, /给我三道创作灵感/);
  assert.match(html, /你现在有什么食材/);
  assert.doesNotMatch(html, />食材台<|>备料清单</);
  assert.doesNotMatch(html, /用餐人数/);
  assert.match(html, /Developed by/);
  assert.match(html, /miaochuan89-sketch/);
  assert.match(html, /CHEF&#x27;S TABLE|CHEF'S TABLE/);
  assert.match(html, /RECIPE IDEAS/);
  assert.match(html, /页面目录/);
  assert.doesNotMatch(html, /aria-label="品牌标记"/);
  assert.doesNotMatch(html, /Your site is taking shape|vinext-starter/);
});

test("recipe API rejects an empty pantry", async () => {
  const response = await request("/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pantry: [] }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "请先添加至少一种食材。" });
});

test("recipe API returns pantry-aware fallback without exposing credentials", async () => {
  const previousKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    const response = await request("/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pantry: ["鸡蛋"], minutes: 15 }),
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.source, "fallback");
    assert.equal(data.reason, "ai_not_configured");
    assert.equal(data.recipes.length, 3);
    assert.ok(data.recipes[0].ingredients.some((item) => item.name === "鸡蛋"));
    assert.doesNotMatch(JSON.stringify(data), /gsk_|GROQ_API_KEY/);
  } finally {
    if (previousKey) process.env.GROQ_API_KEY = previousKey;
  }
});

test("fallback keeps incompatible pantry items out of the same dish", async () => {
  const previousKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    const response = await request("/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pantry: ["香蕉", "鸡肉"], minutes: 30 }),
    });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.recipes.length, 3);
    assert.ok(data.recipes.every((recipe) => {
      const names = recipe.ingredients.map((item) => item.name);
      return !(names.includes("香蕉") && names.includes("鸡肉"));
    }));
  } finally {
    if (previousKey) process.env.GROQ_API_KEY = previousKey;
  }
});
