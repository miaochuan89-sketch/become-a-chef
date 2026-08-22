import { NextRequest, NextResponse } from "next/server";
import { ensureCommunitySchema, getDb, getUploads } from "../../../db";

type PostRow = { id:string; author:string; caption:string; recipe_name:string|null; likes:number; created_at:number };
type CommentRow = { id:string; post_id:string; author:string; body:string; created_at:number };
const postWindows = new Map<string, number>();
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET() {
  await ensureCommunitySchema();
  const db = getDb();
  const posts = await db.prepare("SELECT id, author, caption, recipe_name, likes, created_at FROM posts ORDER BY created_at DESC LIMIT 24").all<PostRow>();
  const ids = posts.results.map(post => post.id);
  let comments:CommentRow[] = [];
  if (ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    const result = await db.prepare(`SELECT id, post_id, author, body, created_at FROM comments WHERE post_id IN (${placeholders}) ORDER BY created_at ASC`).bind(...ids).all<CommentRow>();
    comments = result.results;
  }
  return NextResponse.json({ posts: posts.results.map(post => ({
    id:post.id,
    author:post.author,
    caption:post.caption,
    recipeName:post.recipe_name,
    likes:post.likes,
    createdAt:post.created_at,
    imageUrl:`/api/posts/${post.id}/image`,
    comments:comments.filter(comment => comment.post_id === post.id).map(comment => ({ id:comment.id, author:comment.author, body:comment.body, createdAt:comment.created_at })),
  })) });
}

export async function POST(request:NextRequest) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  const lastPost = postWindows.get(ip) || 0;
  if (Date.now() - lastPost < 60_000) return NextResponse.json({ error:"每分钟只能发布一次，请稍后再试。" }, { status:429 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error:"发布内容无法读取。" }, { status:400 });
  const author = String(form.get("author") || "").trim().slice(0, 32);
  const caption = String(form.get("caption") || "").trim().slice(0, 140);
  const recipeName = String(form.get("recipeName") || "").trim().slice(0, 80) || null;
  const image = form.get("image");
  if (!author || !caption) return NextResponse.json({ error:"请填写发布者名称和一句话。" }, { status:400 });
  if (!(image instanceof File) || !allowedTypes.has(image.type) || image.size === 0 || image.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error:"请选择不超过 5MB 的 JPG、PNG 或 WebP 图片。" }, { status:400 });
  }
  await ensureCommunitySchema();
  const id = crypto.randomUUID();
  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const imageKey = `dish-posts/${id}.${extension}`;
  await getUploads().put(imageKey, await image.arrayBuffer(), { httpMetadata:{ contentType:image.type } });
  try {
    await getDb().prepare("INSERT INTO posts (id, author, caption, recipe_name, image_key, image_type, likes, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
      .bind(id, author, caption, recipeName, imageKey, image.type, Date.now()).run();
  } catch (error) {
    await getUploads().delete(imageKey);
    throw error;
  }
  postWindows.set(ip, Date.now());
  return NextResponse.json({ id }, { status:201 });
}
