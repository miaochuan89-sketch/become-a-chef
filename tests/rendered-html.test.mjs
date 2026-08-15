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

test("recipe API does not expose credentials when AI is unconfigured", async () => {
  const previousKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    const response = await request("/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pantry: ["鸡蛋"], minutes: 15, people: 1 }),
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "AI_NOT_CONFIGURED" });
  } finally {
    if (previousKey) process.env.GROQ_API_KEY = previousKey;
  }
});
