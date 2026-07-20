import { query } from "./db.mjs";
import { readSession } from "./auth.mjs";
import { sendSms } from "./textbee.mjs";
const copy = {
  "new-user": ["Welcome to Findra PH! 👋", "Your account is active. Complete and submit your Business Details from your dashboard."],
  "listing-submitted": ["We’re Reviewing Your Business Details", "We received your submission and it is now under review. We’ll update you within 3–4 business days."],
  "listing-approved": ["Your Business Details are now live 🎉", "Great news — customers can now discover your business and send inquiries on Findra PH."],
  "listing-declined": ["Action needed: Update your Business Details", "A few updates are needed before your business can go live. Please review and resubmit from your dashboard."],
  "subscription-started": ["Your Findra PH subscription is now active", "Your payment was successful. Your Business Details have been submitted for review."],
  "inquiry-received": ["You have a new inquiry on Findra PH", "A potential customer sent you an inquiry. Respond promptly to turn it into an opportunity."],
  "listing-pending-admin": ["New business listing needs review", "A business owner submitted a listing. Review its details and publish or decline it from the Findra admin workspace."],
  "inbox-message-admin": ["New Findra inbox message", "A business owner has sent a message to the Findra admin team."],
  "subscription-renewal": ["Your Findra PH subscription is expiring soon", "Renew your subscription to keep your Business Details live and visible to customers."],
  "inquiry-reply": ["You have a reply to your Findra PH inquiry", "The business you contacted has responded to your inquiry. Check your email for their reply."],
  "inquiry-sent-guest": ["We received your inquiry on Findra PH", "Your message has been sent. The business will get back to you soon."],
  "inquiry-reply-sent-owner": ["Your reply was sent on Findra PH", "Your reply was delivered to the customer by email."],
};
const templateNames = {
  "new-user": "New user welcome",
  "listing-submitted": "Listing submitted for review",
  "listing-approved": "Listing approved — now live",
  "listing-declined": "Listing declined — action required",
  "subscription-started": "Subscription payment successful",
  "inquiry-received": "New inquiry received",
  "listing-pending-admin": "New listing pending admin review",
  "inbox-message-admin": "New inbox message for admin",
  "subscription-renewal": "Subscription renewal reminder",
  "inquiry-reply": "Reply to customer inquiry",
  "inquiry-sent-guest": "Inquiry confirmation to guest",
  "inquiry-reply-sent-owner": "Reply confirmation to business owner",
};
const smsCopy = {
  "new-user": `Hi {{contactFirstName}},

Welcome to Findra PH! Your account is ready.

Check your email for full details.`,
  "listing-submitted": `Hi {{contactFirstName}},

We received {{businessName}} for review.

Check your email for full details.`,
  "listing-approved": `Great news, {{contactFirstName}}!

{{businessName}} is now live on Findra PH.

Check your email for full details.`,
  "listing-declined": `Hi {{contactFirstName}},

{{businessName}} needs a few updates before it can go live.

Check your email for full details.`,
  "subscription-started": `Hi {{contactFirstName}},

Your Findra PH subscription is active.

Check your email for full details.`,
  "inquiry-received": `Hi {{contactFirstName}},

{{businessName}} received a new Findra inquiry.

Check your email for full details.`,
  "listing-pending-admin": `Findra admin,

{{businessName}} is ready for review.

Check your email for full details.`,
  "inbox-message-admin": `Findra admin,

You have a new message from {{contactFirstName}}.

Check your email for full details.`,
  "subscription-renewal": `Hi {{contactFirstName}},

{{daysLeft}} day(s) left on your {{businessName}} subscription.

Renew soon to stay live on Findra PH.`,
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
  const clientSubjects = {
    "new-user": "Welcome to Findra PH!",
    "listing-submitted": "We’re Reviewing Your Business Details",
    "listing-approved": "Your Business Details are now live",
    "listing-declined": "Action needed: Update your Business Details",
    "subscription-started": "Your Findra PH subscription is now active",
    "inquiry-received": "You have a new inquiry on Findra PH",
    "listing-pending-admin": "New Business Details pending review",
    "inbox-message-admin": "New Findra inbox message",
    "subscription-renewal": "{{daysLeft}} day(s) left on your Findra PH subscription",
    "inquiry-reply": "{{replyFrom}} replied to your inquiry on Findra PH",
    "inquiry-sent-guest": "We received your inquiry on Findra PH",
    "inquiry-reply-sent-owner": "Your reply was sent to {{contactFullName}}",
  };
  const clientBodies = {
    "new-user": `<p>Hi {{contactFirstName}},</p><p>Welcome to Findra PH!</p><p>We’re excited to have you on board. You’re officially registered, and your account is now active.</p><p>Here’s what you can do next:</p><ul><li>Complete your Business Details so customers can easily find and contact you.</li><li>Submit your Business Details for review and approval.</li><li>Manage your account and Business Details from your dashboard anytime.</li></ul><p><a href="{{dashboardUrl}}">Access your dashboard</a></p><p>Once your Business Details are submitted, our team will review them within 3–4 business days before they go live.</p><p>Welcome aboard,<br>The Findra PH Team</p>`,
    "listing-submitted": `<p>Hi {{contactFirstName}},</p><p>Thanks for submitting <strong>{{businessName}}</strong> on Findra PH.</p><p>We’ve received your submission, and it’s now under review by our team.</p><p>Here’s what happens next:</p><ul><li>We’ll review your Business Details for accuracy and completeness.</li><li>Once approved, it will go live on the platform.</li><li>You’ll receive another email as soon as the review is completed.</li></ul><p><a href="{{dashboardUrl}}">Manage or update your Business Details</a></p><p>Thanks for choosing Findra PH,<br>The Findra PH Team</p>`,
    "listing-approved": `<p>Hi {{contactFirstName}},</p><p>Great news — <strong>{{businessName}}</strong> has been approved and is now live on Findra PH!</p><p>Customers can now discover your business and send inquiries directly through the platform.</p><p>Here’s what you can do next:</p><ul><li>Review your Business Details to make sure everything looks accurate.</li><li>Keep your information updated to attract more customers.</li><li>Watch out for inquiries and respond promptly.</li></ul><p><a href="{{businessUrl}}">View your public business listing</a></p><p>We’re excited to support your growth!<br>The Findra PH Team</p>`,
    "listing-declined": `<p>Hi {{contactFirstName}},</p><p>Thank you for submitting <strong>{{businessName}}</strong> to Findra PH.</p><p>After review, we’re unable to approve it just yet. A few updates are needed before your business can go live on the platform.</p><p>No worries — this is usually quick and easy to resolve.</p><p>What to do next:</p><ul><li>Log in to your dashboard.</li><li>Review and update your Business Details.</li><li>Resubmit once you’re done.</li></ul><p><a href="{{dashboardUrl}}">Update your Business Details</a></p><p>Regards,<br>The Findra PH Team</p>`,
    "subscription-started": `<p>Hi {{contactFirstName}},</p><p>Your payment was successful — thank you.</p><p>Your Findra PH subscription is now active, and your Business Details will continue to stay visible on the platform.</p><p><a href="{{dashboardUrl}}">Manage your subscription and Business Details</a></p><p>Thank you for growing your business with Findra PH.<br>The Findra PH Team</p>`,
    "inquiry-received": `<p>Hi {{contactFirstName}},</p><p>Good news! You’ve received a new inquiry from a potential customer on Findra PH.</p><p>Responding quickly can help turn inquiries into real business opportunities.</p><p><a href="{{dashboardUrl}}">View and reply to the message</a></p><p>Best regards,<br>The Findra PH Team</p>`,
    "listing-pending-admin": `<p>Hi {{contactFirstName}},</p><p>A new business, <strong>{{businessName}}</strong>, has been submitted on Findra PH and is awaiting your review.</p><p>Please log in to the admin panel to review and approve or request changes.</p><p><a href="{{adminUrl}}">Review the business listing</a></p><p>Prompt review helps ensure a smooth onboarding experience for suppliers and keeps new businesses visible to customers quickly.</p><p>Regards,<br>Findra PH System</p>`,
    "inbox-message-admin": `<p>Hi {{contactFirstName}},</p><p>You have received a new Findra inbox message: <strong>{{businessName}}</strong>.</p><p>Please review the message in the Findra admin workspace.</p><p>Regards,<br>Findra PH System</p>`,
    "subscription-renewal": `<p>Hi {{contactFirstName}},</p><p>Your <strong>{{businessName}}</strong> subscription on Findra PH has <strong>{{daysLeft}} day(s)</strong> left before it expires.</p><p>Renew now to keep your Business Details live and visible to customers without interruption.</p><p><a href="{{dashboardUrl}}">Manage your subscription</a></p><p>Thank you for growing with Findra PH,<br>The Findra PH Team</p>`,
    "inquiry-reply": `<p>Hi {{contactFirstName}},</p><p><strong>{{replyFrom}}</strong> from <strong>{{businessName}}</strong> replied to your inquiry on Findra PH:</p><blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #0b9147;background:#f2faf5;">{{replyMessage}}</blockquote><p>You can reply directly to this email to continue the conversation.</p><p>Best regards,<br>The Findra PH Team</p>`,
    "inquiry-sent-guest": `<p>Hi {{contactFirstName}},</p><p>Thanks for reaching out to <strong>{{businessName}}</strong> on Findra PH. Here's a copy of your message:</p><blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #0b9147;background:#f2faf5;">{{inquiryMessage}}</blockquote><p>The business has been notified and will get back to you soon.</p><p>Best regards,<br>The Findra PH Team</p>`,
    "inquiry-reply-sent-owner": `<p>Hi {{contactFirstName}},</p><p>Your reply to <strong>{{contactFullName}}</strong>'s inquiry on Findra PH has been sent:</p><blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #0b9147;background:#f2faf5;">{{replyMessage}}</blockquote><p><a href="{{dashboardUrl}}">View the conversation</a></p><p>Best regards,<br>The Findra PH Team</p>`,
  };
  return {
    event,
    name: templateNames[event] || "Findra account update",
    subject: clientSubjects[event] || subject,
    body_html: clientBodies[event] || `<p>Hi {{contactFirstName}},</p><p>${body}</p><p><a href="{{dashboardUrl}}">Access your dashboard</a></p><p>The Findra PH Team</p>`,
    from_name: process.env.BREVO_FROM_NAME || "Findra PH",
    from_email: process.env.BREVO_FROM_EMAIL || "",
    reply_to: process.env.BREVO_FROM_EMAIL || "",
    active: true,
  };
}
function smsDefaultsFor(event) {
  return { event, name: templateNames[event] || "Findra SMS update", body: smsCopy[event] || "Hi {{contactFirstName}}, there is an update on your Findra account. Check your email for full details.", active: true };
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
function renderTemplate(value, context = {}) {
  const appUrl = process.env.PAYMONGO_APP_URL || "https://staging.findra.ph";
  const fullName = context.contactFullName || context.userDisplayName || "Findra member";
  const fields = {
    contactFirstName: context.contactFirstName || String(fullName).trim().split(/\s+/)[0] || "there",
    contactFullName: fullName,
    contactEmail: context.contactEmail || "",
    contactPhone: context.contactPhone || "",
    userDisplayName: context.userDisplayName || fullName,
    businessName: context.businessName || "your business",
    dashboardUrl: context.dashboardUrl || `${appUrl}/user`,
    adminUrl: context.adminUrl || `${appUrl}/admin`,
    businessUrl: context.businessUrl || context.dashboardUrl || `${appUrl}/user`,
    supportEmail: process.env.BREVO_FROM_EMAIL || "hello@findra.ph",
    currentYear: new Date().getFullYear(),
    daysLeft: context.daysLeft ?? "",
    replyFrom: context.replyFrom || "The business",
    replyMessage: context.replyMessage || "",
    inquiryMessage: context.inquiryMessage || "",
  };
  return String(value || "").replace(/{{([a-zA-Z]+)}}/g, (match, key) => key in fields ? escapeHtml(fields[key]) : match);
}
function renderPlainText(value, context) {
  return renderTemplate(value, context).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\r\n/g, "\n").replace(/[^\S\r\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
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
async function smsTemplateFor(event) {
  const fallback = smsDefaultsFor(event);
  try {
    const result = await query("SELECT * FROM sms_templates WHERE event=$1", [event]);
    return result.rows[0] ? { ...fallback, ...result.rows[0] } : fallback;
  } catch { return fallback; }
}
async function send(email, template, context) {
  const key=process.env.BREVO_API_KEY, from=template.from_email || process.env.BREVO_FROM_EMAIL;
  if (process.env.BREVO_ENABLED === "false" || !key || !from) return "not_configured";
  const htmlContent = renderTemplate(template.body_html, context);
  const subject = renderTemplate(template.subject, context);
  const response=await fetch("https://api.brevo.com/v3/smtp/email", {method:"POST",headers:{"api-key":key,"Content-Type":"application/json"},body:JSON.stringify({sender:{email:from,name:template.from_name||process.env.BREVO_FROM_NAME||"Findra PH"},replyTo:template.reply_to ? {email:template.reply_to} : undefined,to:[{email}],subject,htmlContent,textContent:htmlContent.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim()})});
  return response.ok ? "sent" : "failed";
}
async function runAdditionalActions(event, email, context) {
  let actions = [];
  try { actions = (await query("SELECT * FROM automation_actions WHERE event=$1 AND active=TRUE ORDER BY id", [event])).rows; } catch { return; }
  const defaultSms = await smsTemplateFor(event);
  if (defaultSms.active && context.contactPhone) {
    try { await sendSms({ recipient: context.contactPhone, message: renderPlainText(defaultSms.body, context) }); } catch { /* SMS is supplementary to the email record. */ }
  }
  await Promise.all(actions.map(async (action) => {
    try {
      if (action.channel === "email" && email) {
        const template = { ...defaultsFor(event), subject: action.subject || defaultsFor(event).subject, body_html: action.body };
        await send(email, template, context);
      }
      if (action.channel === "sms" && context.contactPhone) await sendSms({ recipient: context.contactPhone, message: renderPlainText(action.body, context) });
    } catch { /* Preserve the primary automation if an optional action fails. */ }
  }));
}
export async function notify({userId,email,event,context = {}}) {
  const template = await templateFor(event);
  const [title, body]=copy[event]||["Findra update", "There is a new update in your Findra account."];
  let profile = {};
  if (userId) {
    try { profile = (await query("SELECT display_name, email FROM users WHERE id=$1", [userId])).rows[0] || {}; } catch {}
  }
  const dynamicContext = { ...context, userDisplayName: context.userDisplayName || profile.display_name, contactFullName: context.contactFullName || profile.display_name, contactEmail: context.contactEmail || email || profile.email };
  const status=template.active ? await send(email,template,dynamicContext).catch(()=>"failed") : "paused";
  await query("INSERT INTO notifications (user_id,recipient_email,event,title,body,email_status) VALUES ($1,$2,$3,$4,$5,$6)",[userId||null,email||null,event,title,body,status]);
  await runAdditionalActions(event, email, dynamicContext);
}
export async function notifyAdmins(event, context = {}) {
  const admins = await query("SELECT id, email FROM users WHERE role = 'admin'");
  await Promise.all(admins.rows.map((admin) => notify({ userId: admin.id, email: admin.email, event, context })));
}
export async function handleNotificationsRequest(req,res) {
  const url=new URL(req.url,`http://${req.headers.host||"localhost"}`); if(!url.pathname.startsWith("/api/notifications") && !url.pathname.startsWith("/api/automations")) return false;
  try { const user=await readSession(req); if(!user) return json(res,401,{error:"Please sign in."}),true;
    if(req.method==="GET"&&url.pathname==="/api/notifications") { const result=await query(user.role==="admin"?"SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100":"SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",user.role==="admin"?[]:[user.id]); return json(res,200,{notifications:result.rows}),true; }
    if(req.method === "GET" && url.pathname === "/api/inbox/messages") { const result = await query("SELECT * FROM support_messages WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50", [user.id]); return json(res, 200, { messages: result.rows }), true; }
    if(req.method === "POST" && url.pathname === "/api/inbox/messages") {
      const body = await readJson(req); const subject = String(body.subject || "").trim().slice(0, 160); const message = String(body.message || "").trim().slice(0, 5000);
      if (!subject || !message) return json(res, 400, { error: "Add a subject and message for the Findra team." }), true;
      const created = await query("INSERT INTO support_messages (user_id,sender_email,subject,message) VALUES ($1,$2,$3,$4) RETURNING *", [user.id, user.email, subject, message]);
      notifyAdmins("inbox-message-admin", { contactFirstName: user.display_name, contactFullName: user.display_name, contactEmail: user.email, businessName: subject }).catch(() => {});
      return json(res, 201, { message: created.rows[0] }), true;
    }
    if(user.role === "admin" && req.method === "GET" && url.pathname === "/api/automations/templates") {
      const saved = await query("SELECT * FROM email_templates ORDER BY event");
      const byEvent = new Map(saved.rows.map((row) => [row.event, row]));
      return json(res, 200, { templates: Object.keys(copy).map((event) => ({ ...defaultsFor(event), ...(byEvent.get(event) || {}) })) }), true;
    }
    if(user.role === "admin" && req.method === "GET" && url.pathname === "/api/automations/sms-templates") {
      const saved = await query("SELECT * FROM sms_templates ORDER BY event");
      const byEvent = new Map(saved.rows.map((row) => [row.event, row]));
      return json(res, 200, { templates: Object.keys(copy).map((event) => ({ ...smsDefaultsFor(event), ...(byEvent.get(event) || {}) })) }), true;
    }
    if (user.role === "admin" && req.method === "GET" && url.pathname === "/api/automations/actions") {
      const result = await query("SELECT * FROM automation_actions ORDER BY channel, event, id");
      return json(res, 200, { actions: result.rows }), true;
    }
    if (user.role === "admin" && req.method === "POST" && url.pathname === "/api/automations/actions") {
      const body = await readJson(req); const event = String(body.event || ""); const channel = String(body.channel || "");
      if (!copy[event] || !["email", "sms"].includes(channel)) return json(res, 400, { error: "Choose a valid Findra event and automation channel." }), true;
      const name = String(body.name || "").trim().slice(0, 120); const content = String(body.body || "").trim().slice(0, channel === "sms" ? 1500 : 100000);
      if (!name || !content) return json(res, 400, { error: "Add an action name and message." }), true;
      const result = await query("INSERT INTO automation_actions (event,channel,name,subject,body,active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *", [event, channel, name, String(body.subject || "").trim().slice(0, 180) || null, content, body.active !== false]);
      return json(res, 201, { action: result.rows[0] }), true;
    }
    const actionMatch = url.pathname.match(/^\/api\/automations\/actions\/(\d+)$/);
    if (user.role === "admin" && actionMatch && req.method === "DELETE") {
      await query("DELETE FROM automation_actions WHERE id=$1", [actionMatch[1]]);
      return json(res, 200, { ok: true }), true;
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
    const smsTemplateMatch = url.pathname.match(/^\/api\/automations\/sms-templates\/([a-z-]+)$/);
    if(user.role === "admin" && req.method === "PUT" && smsTemplateMatch) {
      const event = smsTemplateMatch[1];
      if (!copy[event]) return json(res, 404, { error: "Unknown SMS template." }), true;
      const body = await readJson(req); const fallback = smsDefaultsFor(event);
      const template = { event, name: String(body.name || fallback.name).trim().slice(0, 120), body: String(body.body || fallback.body).trim().slice(0, 500), active: body.active !== false };
      if (!template.body) return json(res, 400, { error: "Add an SMS message." }), true;
      const result = await query(`INSERT INTO sms_templates (event,name,body,active) VALUES ($1,$2,$3,$4)
        ON CONFLICT (event) DO UPDATE SET name=EXCLUDED.name,body=EXCLUDED.body,active=EXCLUDED.active,updated_at=NOW() RETURNING *`, [template.event,template.name,template.body,template.active]);
      return json(res, 200, { template: result.rows[0] }), true;
    }
    const match=url.pathname.match(/^\/api\/notifications\/(\d+)\/read$/); if(req.method==="PATCH"&&match){await query("UPDATE notifications SET read_at=NOW() WHERE id=$1 AND (user_id=$2 OR $3='admin')",[match[1],user.id,user.role]);return json(res,200,{ok:true}),true;}
    return json(res,404,{error:"Notification endpoint not found."}),true;
  } catch(error){return json(res,500,{error:error.message}),true;}
}
