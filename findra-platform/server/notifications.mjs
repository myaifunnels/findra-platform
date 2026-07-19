import { query } from "./db.mjs";
import { readSession } from "./auth.mjs";
const copy = {
  "new-user": ["Welcome to Findra PH! 👋", "Your account is active. Complete and submit your Business Details from your dashboard."],
  "listing-submitted": ["We’re Reviewing Your Business Details", "We received your submission and it is now under review. We’ll update you within 3–4 business days."],
  "listing-approved": ["Your Business Details are now live 🎉", "Great news — customers can now discover your business and send inquiries on Findra PH."],
  "listing-declined": ["Action needed: Update your Business Details", "A few updates are needed before your business can go live. Please review and resubmit from your dashboard."],
  "subscription-started": ["Your Findra PH subscription is now active", "Your payment was successful. Your Business Details have been submitted for review."],
  "inquiry-received": ["You have a new inquiry on Findra PH", "A potential customer sent you an inquiry. Respond promptly to turn it into an opportunity."],
  "listing-pending-admin": ["New business listing needs review", "A business owner submitted a listing. Review its details and publish or decline it from the Findra admin workspace."],
};
const templateNames = {
  "new-user": "New user welcome",
  "listing-submitted": "Listing submitted for review",
  "listing-approved": "Listing approved — now live",
  "listing-declined": "Listing declined — action required",
  "subscription-started": "Subscription payment successful",
  "inquiry-received": "New inquiry received",
  "listing-pending-admin": "New listing pending admin review",
};
function json(res, status, body) { res.statusCode=status; res.setHeader("Content-Type","application/json"); res.end(JSON.stringify(body)); }
async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 250_000) throw new Error("Request body is too large.");
  }
  return body ? JSON.parse(body) : {};
}
function defaultsFor(event) {
  const [subject, body] = copy[event] || ["Findra update", "There is a new update in your Findra account."];
  return {
    event,
    name: templateNames[event] || "Findra account update",
    subject,
    body_html: `<p>Hi,</p><p>${body}</p><p><a href="{{dashboardUrl}}">Access your dashboard</a></p><p>The Findra PH Team</p>`,
    from_name: process.env.BREVO_FROM_NAME || "Findra PH",
    from_email: process.env.BREVO_FROM_EMAIL || "",
    reply_to: process.env.BREVO_FROM_EMAIL || "",
    active: true,
  };
}
function renderTemplate(value) {
  return String(value || "").replaceAll("{{dashboardUrl}}", `${process.env.PAYMONGO_APP_URL || "https://staging.findra.ph"}/user`);
}
async function templateFor(event) {
  const fallback = defaultsFor(event);
  try {
    const result = await query("SELECT * FROM email_templates WHERE event=$1", [event]);
    return result.rows[0] ? { ...fallback, ...result.rows[0] } : fallback;
  } catch {
    return fallback;
  }
}
async function send(email, template) {
  const key=process.env.BREVO_API_KEY, from=template.from_email || process.env.BREVO_FROM_EMAIL;
  if (process.env.BREVO_ENABLED === "false" || !key || !from) return "not_configured";
  const htmlContent = renderTemplate(template.body_html);
  const response=await fetch("https://api.brevo.com/v3/smtp/email", {method:"POST",headers:{"api-key":key,"Content-Type":"application/json"},body:JSON.stringify({sender:{email:from,name:template.from_name||process.env.BREVO_FROM_NAME||"Findra PH"},replyTo:template.reply_to ? {email:template.reply_to} : undefined,to:[{email}],subject:template.subject,htmlContent,textContent:htmlContent.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim()})});
  return response.ok ? "sent" : "failed";
}
export async function notify({userId,email,event}) {
  const template = await templateFor(event);
  const [title, body]=copy[event]||["Findra update", "There is a new update in your Findra account."];
  const status=template.active ? await send(email,template).catch(()=>"failed") : "paused";
  await query("INSERT INTO notifications (user_id,recipient_email,event,title,body,email_status) VALUES ($1,$2,$3,$4,$5,$6)",[userId||null,email||null,event,title,body,status]);
}
export async function notifyAdmins(event) {
  const admins = await query("SELECT id, email FROM users WHERE role = 'admin'");
  await Promise.all(admins.rows.map((admin) => notify({ userId: admin.id, email: admin.email, event })));
}
export async function handleNotificationsRequest(req,res) {
  const url=new URL(req.url,`http://${req.headers.host||"localhost"}`); if(!url.pathname.startsWith("/api/notifications") && !url.pathname.startsWith("/api/automations")) return false;
  try { const user=await readSession(req); if(!user) return json(res,401,{error:"Please sign in."}),true;
    if(req.method==="GET"&&url.pathname==="/api/notifications") { const result=await query(user.role==="admin"?"SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100":"SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",user.role==="admin"?[]:[user.id]); return json(res,200,{notifications:result.rows}),true; }
    if(user.role === "admin" && req.method === "GET" && url.pathname === "/api/automations/templates") {
      const saved = await query("SELECT * FROM email_templates ORDER BY event");
      const byEvent = new Map(saved.rows.map((row) => [row.event, row]));
      return json(res, 200, { templates: Object.keys(copy).map((event) => ({ ...defaultsFor(event), ...(byEvent.get(event) || {}) })) }), true;
    }
    const templateMatch = url.pathname.match(/^\/api\/automations\/templates\/([a-z-]+)$/);
    if(user.role === "admin" && req.method === "PUT" && templateMatch) {
      const event = templateMatch[1];
      if (!copy[event]) return json(res, 404, { error: "Unknown email template." }), true;
      const body = await readJson(req);
      const fallback = defaultsFor(event);
      const template = {
        event,
        name: String(body.name || fallback.name).trim().slice(0, 120),
        subject: String(body.subject || fallback.subject).trim().slice(0, 180),
        body_html: String(body.body_html || fallback.body_html).slice(0, 100_000),
        from_name: String(body.from_name || fallback.from_name).trim().slice(0, 120),
        from_email: String(body.from_email || fallback.from_email).trim().toLowerCase().slice(0, 254),
        reply_to: String(body.reply_to || "").trim().toLowerCase().slice(0, 254),
        active: body.active !== false,
      };
      if (!template.subject || !template.body_html || !template.from_email.includes("@")) return json(res, 400, { error: "Add a sender email, subject, and email content." }), true;
      const result = await query(`INSERT INTO email_templates (event,name,subject,body_html,from_name,from_email,reply_to,active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (event) DO UPDATE SET name=EXCLUDED.name,subject=EXCLUDED.subject,body_html=EXCLUDED.body_html,from_name=EXCLUDED.from_name,from_email=EXCLUDED.from_email,reply_to=EXCLUDED.reply_to,active=EXCLUDED.active,updated_at=NOW()
        RETURNING *`, [template.event,template.name,template.subject,template.body_html,template.from_name,template.from_email,template.reply_to,template.active]);
      return json(res, 200, { template: result.rows[0] }), true;
    }
    const match=url.pathname.match(/^\/api\/notifications\/(\d+)\/read$/); if(req.method==="PATCH"&&match){await query("UPDATE notifications SET read_at=NOW() WHERE id=$1 AND (user_id=$2 OR $3='admin')",[match[1],user.id,user.role]);return json(res,200,{ok:true}),true;}
    return json(res,404,{error:"Notification endpoint not found."}),true;
  } catch(error){return json(res,500,{error:error.message}),true;}
}
