import { query } from "./db.mjs";
import { notify } from "./notifications.mjs";
import { subscriptionDaysLeft, billingCycleDays } from "./listings.mjs";

const REMINDER_DAYS = [7, 3, 1];
const REMINDER_EVENTS = { 7: "subscription-renewal-7", 1: "subscription-renewal-1" };

function formatExpirationDate(subscription, createdAt) {
  const start = new Date(subscription.startDate || createdAt);
  const expires = new Date(start.getTime() + billingCycleDays(subscription.billing) * 86_400_000);
  return expires.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export async function runSubscriptionReminders() {
  const result = await query(
    "SELECT * FROM listings WHERE status = 'Published' AND data->'subscription' IS NOT NULL",
  );
  for (const row of result.rows) {
    const data = row.data || {};
    const subscription = data.subscription;
    if (!subscription) continue;
    const daysLeft = subscriptionDaysLeft(subscription, row.created_at);
    if (!REMINDER_DAYS.includes(daysLeft)) continue;
    const remindersSent = Array.isArray(subscription.remindersSent) ? subscription.remindersSent : [];
    if (remindersSent.includes(daysLeft)) continue;

    const context = {
      businessName: row.name,
      contactFirstName: data.owner || row.name,
      contactFullName: data.owner || row.name,
      contactPhone: data.phone || data.whatsapp || data.viber || "",
      daysLeft,
      expirationDate: formatExpirationDate(subscription, row.created_at),
    };
    try {
      const event = REMINDER_EVENTS[daysLeft] || "subscription-renewal";
      await notify({ userId: row.owner_id, email: data.email, event, context });
      const nextData = { ...data, subscription: { ...subscription, remindersSent: [...remindersSent, daysLeft] } };
      await query("UPDATE listings SET data = $1::jsonb WHERE id = $2", [JSON.stringify(nextData), row.id]);
    } catch {
      // A failed reminder for one listing should not block the rest of the run.
    }
  }
}
