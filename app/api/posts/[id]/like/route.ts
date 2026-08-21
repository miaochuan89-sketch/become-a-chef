import { NextRequest, NextResponse } from "next/server";
import { ensureCommunitySchema, getDb } from "../../../../../db";
import { isLikeMilestone, sendLikeNotification } from "../../../notifications/email";

const likes = new Map<string, number>();

export async function POST(request:NextRequest, context:{ params:Promise<{ id:string }> }) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  const { id } = await context.params;
  const key = `${ip}:${id}`;
  if (Date.now() - (likes.get(key) || 0) < 10_000) return NextResponse.json({ error:"已经点过啦。" }, { status:429 });
  await ensureCommunitySchema();
  const result = await getDb().prepare("UPDATE posts SET likes = likes + 1 WHERE id = ? RETURNING likes, author, caption, notification_email, notification_token, notification_verified").bind(id).first<{ likes:number; author:string; caption:string; notification_email:string|null; notification_token:string|null; notification_verified:number }>();
  if (!result) return NextResponse.json({ error:"作品不存在。" }, { status:404 });
  likes.set(key, Date.now());
  if (isLikeMilestone(result.likes) && result.notification_verified && result.notification_email && result.notification_token) {
    await sendLikeNotification(result.notification_email, result.author, result.caption, result.likes, id, result.notification_token).catch(() => false);
  }
  return NextResponse.json({ likes:result.likes });
}
