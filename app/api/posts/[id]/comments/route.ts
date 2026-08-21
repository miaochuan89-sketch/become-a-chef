import { NextRequest, NextResponse } from "next/server";
import { ensureCommunitySchema, getDb } from "../../../../../db";
import { sendCommentNotification } from "../../../notifications/email";

const commentWindows = new Map<string, number>();

export async function POST(request:NextRequest, context:{ params:Promise<{ id:string }> }) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  if (Date.now() - (commentWindows.get(ip) || 0) < 10_000) return NextResponse.json({ error:"评论太快了，请稍后再试。" }, { status:429 });
  const { id:postId } = await context.params;
  const body = await request.json().catch(() => null) as { author?:unknown; body?:unknown } | null;
  const author = typeof body?.author === "string" ? body.author.trim().slice(0, 32) : "";
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, 180) : "";
  if (!author || !text) return NextResponse.json({ error:"请填写名称和评论。" }, { status:400 });
  await ensureCommunitySchema();
  const post = await getDb().prepare("SELECT id, author, caption, notification_email, notification_token, notification_verified FROM posts WHERE id = ?").bind(postId).first<{ id:string; author:string; caption:string; notification_email:string|null; notification_token:string|null; notification_verified:number }>();
  if (!post) return NextResponse.json({ error:"作品不存在。" }, { status:404 });
  const comment = { id:crypto.randomUUID(), author, body:text, createdAt:Date.now() };
  await getDb().prepare("INSERT INTO comments (id, post_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(comment.id, postId, comment.author, comment.body, comment.createdAt).run();
  if (post.notification_verified && post.notification_email && post.notification_token) {
    await sendCommentNotification(post.notification_email, post.author, post.caption, comment.author, comment.body, postId, post.notification_token).catch(() => false);
  }
  commentWindows.set(ip, Date.now());
  return NextResponse.json({ comment }, { status:201 });
}
