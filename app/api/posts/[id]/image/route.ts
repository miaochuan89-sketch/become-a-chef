import { NextRequest, NextResponse } from "next/server";
import { ensureCommunitySchema, getDb, getUploads } from "../../../../../db";

export async function GET(_request:NextRequest, context:{ params:Promise<{ id:string }> }) {
  await ensureCommunitySchema();
  const { id } = await context.params;
  const post = await getDb().prepare("SELECT image_key, image_type FROM posts WHERE id = ?").bind(id).first<{ image_key:string; image_type:string }>();
  if (!post) return NextResponse.json({ error:"图片不存在。" }, { status:404 });
  const object = await getUploads().get(post.image_key);
  if (!object) return NextResponse.json({ error:"图片不存在。" }, { status:404 });
  return new Response(object.body, { headers:{ "Content-Type":post.image_type, "Cache-Control":"public, max-age=3600", "ETag":object.httpEtag } });
}
