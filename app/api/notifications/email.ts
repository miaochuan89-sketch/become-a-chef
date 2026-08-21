const SITE_URL = "https://jinwan-chisha.miaochuan89.chatgpt.site";

export const validEmail = (value:string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
export const notificationsConfigured = () => Boolean(process.env.POSTMARK_SERVER_TOKEN && process.env.POSTMARK_FROM_EMAIL);
export const newNotificationToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
};

async function sendEmail(to:string, subject:string, text:string) {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.POSTMARK_FROM_EMAIL;
  if (!token || !from) return false;
  const response = await fetch("https://api.postmarkapp.com/email", {
    method:"POST",
    headers:{ "Content-Type":"application/json", Accept:"application/json", "X-Postmark-Server-Token":token },
    body:JSON.stringify({ From:`BECOME A CHEF <${from}>`, To:to, Subject:subject, TextBody:text, MessageStream:"outbound", Tag:"chef-notification" }),
    signal:AbortSignal.timeout(5000),
  });
  if (!response.ok) console.warn("Notification email failed", { status:response.status });
  return response.ok;
}

export function sendVerification(email:string, postId:string, token:string) {
  const link = `${SITE_URL}/api/notifications/verify?post=${encodeURIComponent(postId)}&token=${encodeURIComponent(token)}`;
  return sendEmail(email, "确认接收 BECOME A CHEF 动态通知", `请点击下面的链接确认通知邮箱：\n\n${link}\n\n确认后，当这条动态收到评论或达到新的点赞里程碑时，你会收到邮件。`);
}

export function sendCommentNotification(email:string, author:string, caption:string, commenter:string, comment:string, postId:string, token:string) {
  const stop = `${SITE_URL}/api/notifications/verify?action=unsubscribe&post=${encodeURIComponent(postId)}&token=${encodeURIComponent(token)}`;
  return sendEmail(email, `${commenter} 评论了你的菜`, `${author}，你好！\n\n你发布的“${caption}”收到一条新评论：\n${commenter}：${comment}\n\n查看网站：${SITE_URL}\n停止这条动态的通知：${stop}`);
}

export function sendLikeNotification(email:string, author:string, caption:string, likes:number, postId:string, token:string) {
  const stop = `${SITE_URL}/api/notifications/verify?action=unsubscribe&post=${encodeURIComponent(postId)}&token=${encodeURIComponent(token)}`;
  return sendEmail(email, `你的菜收到了 ${likes} 个赞`, `${author}，你好！\n\n你发布的“${caption}”已经收到 ${likes} 个赞。\n\n查看网站：${SITE_URL}\n停止这条动态的通知：${stop}`);
}

export const isLikeMilestone = (likes:number) => [1, 5, 10, 25, 50].includes(likes) || (likes >= 100 && likes % 100 === 0);
