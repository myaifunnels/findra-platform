# Findra infrastructure notes

Where each part of Findra lives. No passwords are kept here. Logins are in the
client handover spreadsheet (`docs/client/`, git-ignored on purpose).

## Business
- Registered business: MK Lanoch Trading and Development Corp. Brand: Findra.
- Client contacts: Michael Simbulan and Katrina Simbulan (numbers are in the
  onboarding form PDF, not stored in this repo).
- Source of these details: the MK Client Onboarding Form (client onboarding folder).

## Current stack
| Part | Provider | Notes |
|---|---|---|
| App hosting | Render | Runs `server.mjs` and serves the built site |
| Domain `findra.ph` | Z.com (registrar) | Separate from hosting. Expired in early Nov 2026, renew first. DNS must point to Render |
| Business email `hello@findra.ph` | Microsoft 365 Email Essential | Keep. Confirm whether it is billed through GoDaddy before cancelling anything there |
| Payments | PayMongo | Monthly auto-billing needs Subscriptions enabled by PayMongo |
| Transactional email | Brevo | Sender name/address set in Admin → Integrations |
| SMS | TextBee | |
| File storage | Cloudflare R2 | |
| Maps | Google Maps API | |
| Database | PostgreSQL (provider to confirm, possibly Render) | |

## Old stack (to cancel once verified)
- GoDaddy Managed WordPress hosting, Listivo theme and WordPress add-ons.
- The onboarding form lists GoDaddy as the hosting provider; the platform has since moved to Render.
- The client was asked to match recurring card charges against the list in the
  handover spreadsheet before cancelling.

## Before cancelling anything at GoDaddy
1. Confirm `findra.ph` DNS (managed at Z.com) points to Render, not GoDaddy.
2. Confirm the Microsoft 365 email is not billed or managed through GoDaddy, or move it first.
3. Take a full backup of the old WordPress site.

## Open items
- Renew `findra.ph` at Z.com.
- Confirm where the database is hosted.
- The onboarding form still lists the payment gateway and Brevo as "Pending";
  both are now integrated.
