"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Comment = { id:string; author:string; body:string; createdAt:number };
type CommunityPost = { id:string; author:string; caption:string; recipeName:string|null; likes:number; createdAt:number; imageUrl:string; comments:Comment[] };

export default function CommunityFeed({ recipeName }:{ recipeName?:string }) {
  const [posts,setPosts]=useState<CommunityPost[]>([]);
  const [author,setAuthor]=useState("");
  const [caption,setCaption]=useState("");
  const [notificationEmail,setNotificationEmail]=useState("");
  const [notificationsEnabled,setNotificationsEnabled]=useState(false);
  const [image,setImage]=useState<File|null>(null);
  const [status,setStatus]=useState("");
  const [publishing,setPublishing]=useState(false);
  const [commenting,setCommenting]=useState<string|null>(null);
  const [commentAuthor,setCommentAuthor]=useState("");
  const [commentBody,setCommentBody]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);
  const preview=useMemo(()=>image?URL.createObjectURL(image):"",[image]);

  async function loadPosts(){try{const response=await fetch("/api/posts");const data=await response.json() as {posts?:CommunityPost[]};if(response.ok)setPosts(data.posts||[])}catch{setStatus("Chef’s Table 暂时无法加载。")}}
  useEffect(()=>{const timer=window.setTimeout(()=>{void loadPosts();void fetch("/api/notifications/status").then(response=>response.json()).then((data:{enabled?:boolean})=>setNotificationsEnabled(Boolean(data.enabled))).catch(()=>setNotificationsEnabled(false))},0);return()=>window.clearTimeout(timer)},[]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);

  async function publish(event:FormEvent){event.preventDefault();if(!image){setStatus("请先选择一张成品照片。");return}setPublishing(true);setStatus("");const form=new FormData();form.set("author",author);form.set("caption",caption);form.set("notificationEmail",notificationEmail);form.set("image",image);if(recipeName)form.set("recipeName",recipeName);try{const response=await fetch("/api/posts",{method:"POST",body:form});const data=await response.json() as {error?:string;notificationRequested?:boolean;verificationSent?:boolean};if(!response.ok)throw new Error(data.error||"发布失败");setAuthor("");setCaption("");setNotificationEmail("");setImage(null);if(fileRef.current)fileRef.current.value="";setStatus(data.notificationRequested?(data.verificationSent?"发布成功。请打开邮件确认，之后就能收到评论和点赞通知。":"动态已发布，但确认邮件暂时没有发出。") : "发布成功，已经出现在 Chef’s Table。");await loadPosts()}catch(error){setStatus(error instanceof Error?error.message:"发布失败，请稍后再试。")}finally{setPublishing(false)}}
  async function like(postId:string){try{const response=await fetch(`/api/posts/${postId}/like`,{method:"POST"});const data=await response.json() as {likes?:number;error?:string};if(!response.ok)throw new Error(data.error||"点赞失败");setPosts(current=>current.map(post=>post.id===postId?{...post,likes:data.likes??post.likes+1}:post))}catch(error){setStatus(error instanceof Error?error.message:"点赞失败。")}}
  async function comment(event:FormEvent,postId:string){event.preventDefault();try{const response=await fetch(`/api/posts/${postId}/comments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({author:commentAuthor,body:commentBody})});const data=await response.json() as {comment?:Comment;error?:string};if(!response.ok||!data.comment)throw new Error(data.error||"评论失败");setPosts(current=>current.map(post=>post.id===postId?{...post,comments:[...post.comments,data.comment!]}:post));setCommentAuthor("");setCommentBody("");setCommenting(null)}catch(error){setStatus(error instanceof Error?error.message:"评论失败。")}}

  return <section id="chefs-table" className="community-section">
    <div className="community-heading"><div><span className="eyebrow">CHEF&apos;S TABLE</span><h2>把这一餐留下来</h2><p>一张照片、你的名称和一句话。无需注册。</p></div><span className="community-count">{posts.length} DISHES</span></div>
    <div className="community-layout">
      <form className="post-composer" onSubmit={publish}>
        <div className={`photo-drop ${preview?"has-photo":""}`}>
          {preview?<img src={preview} alt="待发布的菜品预览"/>:<div><span>＋</span><b>ADD A DISH PHOTO</b><small>JPG · PNG · WEBP · MAX 5MB</small></div>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>setImage(event.target.files?.[0]||null)} aria-label="选择菜品照片" required/>
        </div>
        {recipeName&&<div className="recipe-link">FROM TODAY&apos;S RECIPE · <b>{recipeName}</b></div>}
        <label>YOUR NAME<input value={author} onChange={event=>setAuthor(event.target.value)} maxLength={32} placeholder="Who made this?" required/></label>
        <label>ONE SENTENCE<input value={caption} onChange={event=>setCaption(event.target.value)} maxLength={140} placeholder="Say one thing about this dish…" required/></label>
        {notificationsEnabled&&<label>NOTIFICATION EMAIL · OPTIONAL<input type="email" autoComplete="email" value={notificationEmail} onChange={event=>setNotificationEmail(event.target.value)} maxLength={254} placeholder="Only used for private notifications"/><small>不会公开。确认邮箱后，评论会即时通知，点赞只在里程碑时通知。</small></label>}
        <button className="publish-button" disabled={publishing}>{publishing?"PUBLISHING…":"PUBLISH TO CHEF’S TABLE →"}</button>
        {status&&<p className="community-status">{status}</p>}
      </form>
      <div className="post-grid">
        {!posts.length&&<div className="community-empty"><span>🍽️</span><h3>The table is ready.</h3><p>Be the first person to share what you made.</p></div>}
        {posts.map(post=><article className="dish-post" key={post.id}>
          <img src={post.imageUrl} alt={`${post.author} 分享的菜品`}/>
          <div className="dish-post-body"><div className="post-meta"><b>{post.author}</b><time>{new Date(post.createdAt).toLocaleDateString("zh-CN")}</time></div><p>{post.caption}</p>{post.recipeName&&<small>Made from · {post.recipeName}</small>}
            <div className="post-actions"><button onClick={()=>like(post.id)} aria-label={`为 ${post.author} 的菜点赞`}>♥ <span>{post.likes}</span></button><button onClick={()=>setCommenting(commenting===post.id?null:post.id)}>COMMENT <span>{post.comments.length}</span></button></div>
            {!!post.comments.length&&<div className="comments">{post.comments.map(item=><p key={item.id}><b>{item.author}</b>{item.body}</p>)}</div>}
            {commenting===post.id&&<form className="comment-form" onSubmit={event=>comment(event,post.id)}><input value={commentAuthor} onChange={event=>setCommentAuthor(event.target.value)} maxLength={32} placeholder="Your name" aria-label="评论者名称" required/><input value={commentBody} onChange={event=>setCommentBody(event.target.value)} maxLength={180} placeholder="Write a comment…" aria-label="评论内容" required/><button>POST</button></form>}
          </div>
        </article>)}
      </div>
    </div>
  </section>
}
