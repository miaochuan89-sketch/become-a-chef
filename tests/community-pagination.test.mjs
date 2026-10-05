import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { runInNewContext } from "node:vm";
import ts from "typescript";

test("community history remains reachable beyond 24 posts, including tied timestamps and new uploads", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(readFileSync(new URL("../drizzle/0000_chefs_table.sql", import.meta.url), "utf8"));
    const insert = sqlite.prepare("INSERT INTO posts (id, author, caption, image_key, image_type, created_at) VALUES (?, 'Chef', 'Dinner', ?, 'image/jpeg', ?)");
    for (let i = 0; i < 53; i++) {
      const id = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
      insert.run(id, `${id}.jpg`, 1000 + Math.floor(i / 3));
    }
    const oldestId = "00000000-0000-4000-8000-000000000000";
    sqlite.prepare("INSERT INTO comments (id, post_id, author, body, created_at) VALUES ('comment', ?, 'Friend', 'Looks good', 1001)").run(oldestId);
    let unavailable = false;
    const db = { prepare(sql) {
      if (unavailable) throw new Error("Storage unavailable");
      const statement = sqlite.prepare(sql);
      let bindings = [];
      return {
        bind(...values) { bindings = values; return this; },
        async all() { return { results:statement.all(...bindings) }; },
        async first() { return statement.get(...bindings) ?? null; },
      };
    } };
    const source = readFileSync(new URL("../app/api/posts/route.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions:{ module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    runInNewContext(compiled, { exports, URL, Map, console:{ error() {} }, require(name) {
      if (name === "next/server") return { NextResponse:{ json:(body, init) => Response.json(body, init) } };
      if (name === "../../../db") return { ensureCommunitySchema:async () => {}, getDb:() => db };
      throw new Error(`Unexpected dependency: ${name}`);
    } });
    const get = cursor => exports.GET(new Request(`https://example.com/api/posts${cursor === undefined ? "" : `?before=${encodeURIComponent(cursor)}`}`));
    const firstResponse = await get();
    assert.equal(firstResponse.headers.get("cache-control"), "no-store");
    const first = await firstResponse.json();
    assert.equal(first.total, 53);
    assert.equal(first.posts.length, 24);
    assert.ok(first.nextCursor);
    // A newly published post must not shift the next page or repeat old posts.
    insert.run("00000000-0000-4000-8000-000000000099", "new.jpg", 2000);
    const second = await (await get(first.nextCursor)).json();
    const third = await (await get(second.nextCursor)).json();
    assert.equal(second.total, 54);
    assert.equal(second.posts.length, 24);
    assert.equal(third.posts.length, 5);
    assert.equal(third.nextCursor, null);
    const history = [...first.posts, ...second.posts, ...third.posts];
    assert.equal(new Set(history.map(post => post.id)).size, 53);
    const oldest = history.at(-1);
    assert.equal(oldest.id, oldestId);
    assert.equal(oldest.imageUrl, `/api/posts/${oldestId}/image`);
    assert.equal(oldest.comments[0].body, "Looks good");
    const empty = await (await get(`${oldest.createdAt}:${oldest.id}`)).json();
    assert.equal(empty.posts.length, 0);
    assert.equal(empty.nextCursor, null);
    for (const invalid of ["", "garbage", "9999999999999999:00000000-0000-4000-8000-000000000000"]) {
      assert.equal((await get(invalid)).status, 400);
    }
    unavailable = true;
    assert.equal((await get()).status, 503);
  } finally {
    sqlite.close();
  }
});
