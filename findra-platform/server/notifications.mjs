import { query } from "./db.mjs";
import { readSession } from "./auth.mjs";
const copy = {
  "new-user": ["Welcome to Findra PH! 👋", "Your account is active. Complete and submit your Business Details from your dashboard."],
  "listing-submitted": ["We’re Reviewing Your Business Details", "We received your submission and it is now under review. We’ll update you within 3–4 business days."],
  "listing-approved": ["Your Business Details are now live 🎉", "Great news — customers can now discover your business and send inquiries on Findra PH."],
  "listing-declined": ["Action needed: Update your Business Details", "A few updates are needed before your business can go live. Please review and resubmit from your dashboard."],
  "subscription-started": ["Your Findra PH subscription is now active", "Your payment was successful. Your Business Details have been submitted for review."],
  "inquiry-received": ["You have a new inquiry on Findra PH", "A potential customer sent you an inquiry. Respond promptly to turn it into an opportunity."],
};
function json(res, status, body) { res.statusCode=status; res.setHeader("Content-Type","application/json"); res.end(JSON.stringify(body)); }
async function send(email, subject, text) {
  const key=process.env.BREVO_API_KEY, from=process.env.BREVO_FROM_EMAIL;
  if (process.env.BREVO_ENABLED === "false" || !key || !from) return "not_configured";
  const response=await fetch("https://api.brevo.com/v3/smtp/email", {method:"POST",headers:{"api-key":key,"Content-Type":"application/json"},body:JSON.stringify({sender:{email:from,name:process.env.BREVO_FROM_NAME||"Findra PH"},to:[{email}],subject,textContent:text})});
  return response.ok ? "sent" : "failed";
}
export async function notify({userId,email,event}) {
  const [title, body]=copy[event]||["Findra update", "There is a new update in your Findra account."];
  const status=await send(email,title,`Hi,\n\n${body}\n\nAccess your dashboard: ${process.env.PAYMONGO_APP_URL||"https://staging.findra.ph"}/user\n\nThe Findra PH Team`).catch(()=>"failed");
  await query("INSERT INTO notifications (user_id,recipient_email,event,title,body,email_status) VALUES ($1,$2,$3,$4,$5,$6)",[userId||null,email||null,event,title,body,status]);
}
export async function handleNotificationsRequest(req,res) {
  const url=new URL(req.url,`http://${req.headers.host||"localhost"}`); if(!url.pathname.startsWith("/api/notifications")) return false;
  try { const user=await readSession(req); if(!user) return json(res,401,{error:"Please sign in."}),true;
    if(req.method==="GET"&&url.pathname==="/api/notifications") { const result=await query(user.role==="admin"?"SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100":"SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",user.role==="admin"?[]:[user.id]); return json(res,200,{notifications:result.rows}),true; }
    const match=url.pathname.match(/^\/api\/notifications\/(\d+)\/read$/); if(req.method==="PATCH"&&match){await query("UPDATE notifications SET read_at=NOW() WHERE id=$1 AND (user_id=$2 OR $3='admin')",[match[1],user.id,user.role]);return json(res,200,{ok:true}),true;}
    return json(res,404,{error:"Notification endpoint not found."}),true;
  } catch(error){return json(res,500,{error:error.message}),true;}
}
