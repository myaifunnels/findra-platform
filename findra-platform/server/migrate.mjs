import { closeDatabase, query } from "./db.mjs";

const migration = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  password_hash TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended'));

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listings (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  name TEXT NOT NULL,
  category TEXT,
  location TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listings_owner_id_idx ON listings(owner_id);
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS inquiries (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT REFERENCES listings(id) ON DELETE SET NULL,
  target TEXT NOT NULL DEFAULT 'business' CHECK (target IN ('business', 'admin')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Read', 'Responded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS inquiries_listing_id_idx ON inquiries(listing_id);
CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries(created_at DESC);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS inquiry_replies (
  id BIGSERIAL PRIMARY KEY,
  inquiry_id BIGINT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS inquiry_replies_inquiry_id_idx ON inquiry_replies(inquiry_id, created_at);

-- Contact details identify a business listing. Keep legacy records intact, but
-- reject any future create/update that reuses a business email or phone number.
CREATE OR REPLACE FUNCTION prevent_duplicate_listing_contacts()
RETURNS TRIGGER AS $$
DECLARE
  candidate_email TEXT := lower(trim(COALESCE(NEW.data->>'email', '')));
  candidate_phone TEXT := regexp_replace(COALESCE(NEW.data->>'phone', ''), '\\D', '', 'g');
BEGIN
  IF candidate_phone ~ '^0[0-9]{10}$' THEN
    candidate_phone := '63' || substr(candidate_phone, 2);
  END IF;

  IF candidate_email <> '' AND EXISTS (
    SELECT 1 FROM listings current_listing
    WHERE current_listing.id IS DISTINCT FROM NEW.id
      AND lower(trim(COALESCE(current_listing.data->>'email', ''))) = candidate_email
  ) THEN
    RAISE EXCEPTION 'This business email address is already used by another listing.' USING ERRCODE = '23505';
  END IF;

  IF candidate_phone <> '' AND EXISTS (
    SELECT 1 FROM listings current_listing
    WHERE current_listing.id IS DISTINCT FROM NEW.id
      AND CASE
        WHEN regexp_replace(COALESCE(current_listing.data->>'phone', ''), '\\D', '', 'g') ~ '^0[0-9]{10}$'
          THEN '63' || substr(regexp_replace(COALESCE(current_listing.data->>'phone', ''), '\\D', '', 'g'), 2)
        ELSE regexp_replace(COALESCE(current_listing.data->>'phone', ''), '\\D', '', 'g')
      END = candidate_phone
  ) THEN
    RAISE EXCEPTION 'This business phone number is already used by another listing.' USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listings_unique_contact_trigger ON listings;
CREATE TRIGGER listings_unique_contact_trigger
BEFORE INSERT OR UPDATE OF data ON listings
FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_listing_contacts();

CREATE TABLE IF NOT EXISTS packages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  interval TEXT NOT NULL DEFAULT 'Yearly',
  status TEXT NOT NULL DEFAULT 'Active',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO packages (name, price, interval, status, featured, features)
SELECT 'Findra Business Listing', 999, 'Yearly', 'Active', TRUE,
  '["Published business listing", "Logo, gallery, video, and attachments", "Customer inquiry and direct contact tools", "Business-owner dashboard access"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM packages);

-- Replaced by three billing-cycle tiers of the same listing package, priced
-- so each longer commitment drops the effective monthly rate by ₱150
-- (₱799/mo -> ₱649/mo for 6 Months -> ₱499/mo for Annually). Any other
-- package - the old ₱999/Yearly default, an ad-hoc ₱499 plan, or one since
-- renamed by hand in the admin panel (e.g. "Basic Plan") - is removed so the
-- Packages page and PayMongo checkout only ever see these three.
DELETE FROM packages WHERE name NOT IN ('Monthly', '6 Months', 'Annually');

INSERT INTO packages (name, price, interval, status, featured, features)
SELECT 'Monthly', 799, 'Monthly', 'Active', FALSE,
  '["Complete public business profile", "Categories and multiple services", "Logo, featured image, gallery, and video", "Customer inquiry and direct contact tools", "Business-owner dashboard access"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'Monthly');

INSERT INTO packages (name, price, interval, status, featured, features)
SELECT '6 Months', 3894, '6 Months', 'Active', FALSE,
  '["Complete public business profile", "Categories and multiple services", "Logo, featured image, gallery, and video", "Customer inquiry and direct contact tools", "Business-owner dashboard access"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = '6 Months');

INSERT INTO packages (name, price, interval, status, featured, features)
SELECT 'Annually', 5988, 'Annually', 'Active', TRUE,
  '["Complete public business profile", "Categories and multiple services", "Logo, featured image, gallery, and video", "Customer inquiry and direct contact tools", "Business-owner dashboard access"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'Annually');

-- Keep the canonical tiers' prices in sync with the ₱150-per-tier pricing
-- above even if this migration already ran once with the older totals.
UPDATE packages SET price = 799 WHERE name = 'Monthly';
UPDATE packages SET price = 3894 WHERE name = '6 Months';
UPDATE packages SET price = 5988 WHERE name = 'Annually';

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_email TEXT, event TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'queued', read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS email_templates (
  event TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  from_name TEXT,
  from_email TEXT,
  reply_to TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_actions (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS automation_actions_event_idx ON automation_actions(event, channel);

CREATE TABLE IF NOT EXISTS sms_templates (
  event TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL DEFAULT 'about-page',
  brevo_status TEXT NOT NULL DEFAULT 'pending',
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS support_messages_user_id_idx ON support_messages(user_id, created_at DESC);
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Read', 'Responded'));

CREATE TABLE IF NOT EXISTS support_message_replies (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'user' CHECK (sender_role IN ('user', 'admin')),
  message TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS support_message_replies_message_id_idx ON support_message_replies(message_id, created_at ASC);
`;

try {
  await query(migration);
  console.log("Findra database migrations completed.");
} finally {
  await closeDatabase();
}
