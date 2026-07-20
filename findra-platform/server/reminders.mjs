import { query } from "./db.mjs";
import { notify } from "./notifications.mjs";
import { subscriptionDaysLeft } from "./listings.mjs";

const REMINDER_DAYS = [7, 3, 1];

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
    };
    try {
      await notify({ userId: row.owner_id, email: data.email, event: "subscription-renewal", context });
      const nextData = { ...data, subscription: { ...subscription, remindersSent: [...remindersSent, daysLeft] } };
      await query("UPDATE listings SET data = $1::jsonb WHERE id = $2", [JSON.stringify(nextData), row.id]);
    } catch {
      // A failed reminder for one listing should not block the rest of the run.
    }
  }
}
