import { NextRequest, NextResponse } from "next/server";
import { ensureCommunitySchema, getDb } from "../../../../db";

const page = (title:string, message:string) => new NextResponse(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><body style="font-family:system-ui;background:#f7f1e8;color:#2c1b14;display:grid;place-items:center;min-height:100vh;margin:0"><main style="max-width:520px;padding:40px;text-align:center"><h1>${title}</h1><p>${message}</p><a href="/" style="color:#c5532d">返回 BECOME A CHEF</a></main></body></html>`, { headers:{ "Content-Type":"text/html; charset=utf-8" } });

export async function GET(request:NextRequest) {
  const postId = request.nextUrl.searchParams.get("post") || "";
  const token = request.nextUrl.searchParams.get("token") || "";
  const unsubscribe = request.nextUrl.searchParams.get("action") === "unsubscribe";
  if (!postId || !token) return page("链接无效", "这个通知链接不完整。");
  await ensureCommunitySchema();
  const sql = unsubscribe
    ? "UPDATE posts SET notification_email = NULL, notification_token = NULL, notification_verified = 0 WHERE id = ? AND notification_token = ?"
    : "UPDATE posts SET notification_verified = 1 WHERE id = ? AND notification_token = ?";
  const result = await getDb().prepare(sql).bind(postId, token).run();
  if (!result.meta.changes) return page("链接已失效", "这条动态不存在，或通知链接已经失效。");
  return unsubscribe ? page("通知已关闭", "这条动态将不再发送点赞或评论邮件。") : page("邮箱确认成功", "这条动态收到评论或新的点赞里程碑时，我们会通知你。");
}
