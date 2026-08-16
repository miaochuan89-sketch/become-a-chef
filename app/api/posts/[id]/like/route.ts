import { NextRequest, NextResponse } from "next/server";
import { ensureCommunitySchema, getDb } from "../../../../../db";

const likes = new Map<string, number>();

export async function POST(request:NextRequest, context:{ params:Promise<{ id:string }> }) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  const { id } = await context.params;
  const key = `${ip}:${id}`;
  if (Date.now() - (likes.get(key) || 0) < 10_000) return NextResponse.json({ error:"已经点过啦。" }, { status:429 });
  await ensureCommunitySchema();
  const result = await getDb().prepare("UPDATE posts SET likes = likes + 1 WHERE id = ? RETURNING likes").bind(id).first<{ likes:number }>();
  if (!result) return NextResponse.json({ error:"作品不存在。" }, { status:404 });
  likes.set(key, Date.now());
  return NextResponse.json({ likes:result.likes });
}
