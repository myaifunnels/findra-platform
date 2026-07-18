# Findra PH Client Feedback & QA Report

**QA date:** July 18, 2026  
**Overall status:** Core prototype flows work, but the platform is **not yet production-ready** because authentication, payments, persistent storage, and transactional email are still simulated or incomplete.

## Client question: package visibility for guests

Guests should be able to see the available package before they log in or register. This has been implemented as a public `/packages` page showing the single **Findra Business Listing — PHP 999/year** plan.

The intended flow is now:

1. Guest views the package.
2. Guest enters the business listing details.
3. Guest creates an account or signs in before checkout.
4. Guest pays through PayMongo.
5. The listing is submitted for admin approval.

## Client feedback status

| # | Feedback | Status | Resolution |
|---|---|---|---|
| 1 | Homepage Instagram icon was not linked | Resolved | Footer Instagram now opens `https://www.instagram.com/findra.ph/`. |
| 2 | Newsletter email appeared cut off | Resolved | Input layout was corrected and tested with a long email address. |
| 3 | Legal page used `info@findra.ph` | Resolved, client confirmation advised | Standardized to `hello@findra.ph`, matching the main site contact. Confirm this is the official legal inbox before launch. |
| 4 | FAQ referred to multiple packages and guests could not see plans | Resolved | FAQ now describes one PHP 999/year plan and a public package page is available without authentication. |
| 5 | Supplier FAQ had an inconsistent registration/package flow | Resolved | Copy now states that guests can view the plan and start a listing before account creation. |
| 6 | Contact consent copy and legal links were incorrect | Resolved | Added the requested consent sentence with working Privacy Policy and Terms of Use anchors. |

## QA health by workflow

| Workflow | Health | Findings |
|---|---|---|
| Public information pages | Pass | Homepage, About, FAQ, Contact, Legal, and Packages render. Client copy issues were corrected. |
| Directory search and filters | Pass for tested cases | Keyword and category filtering returned the expected sample listings. A full data-volume test is still needed. |
| Business listing detail | Partial | Core identity, category, services, media, contact, and inquiry areas render when data exists. WhatsApp/Viber and data completeness rules are missing. |
| Inquiry submission | Partial | Success feedback appears and a local notification record is created. No real supplier/admin email is sent yet. |
| Registration and login | Blocked for production | Current login is demo/local. Registration, email verification, secure sessions, and password reset are not implemented end-to-end. |
| User dashboard | Partial | Listing CRUD and dashboard UI exist, but depend on local browser storage rather than a production API/database. |
| Guest listing submission | Partial | Public plan visibility and listing-first flow work. Persistent ownership, server validation, account handoff, and checkout completion remain. |
| Admin listing approval | Partial | Pending/approve/reject UI exists. Production permissions, audit history, and real notification delivery remain. |
| Subscription and payment | Blocked | PayMongo settings UI exists, but credentials, live checkout, verified webhooks, and subscription activation are not configured. |
| Automations and email | Blocked | Brevo settings can be stored, but workflow events currently log locally and do not send production transactional email. |
| Mobile layout | Pass for sampled public pages | Packages, FAQ, and Contact were sampled. A complete device/browser matrix is still required. |
| Performance | Partial | Production build passes. The main JavaScript bundle is just over 500 kB and should be code-split. |
| Launch readiness | Not ready | P0 production foundations below must be completed before accepting real users or payments. |

## Missing items to build

### P0 — required before launch

1. **Production authentication:** registration, secure login/session handling, email verification, forgot/reset password, logout, and role-based access.
2. **Backend database and API:** persistent users, listings, categories, services, inquiries, packages, subscriptions, payments, notifications, and audit history.
3. **Media/object storage:** production uploads for logos, featured images, galleries, and attachments instead of browser-local base64 data.
4. **PayMongo end-to-end integration:** test/live keys, checkout session creation, redirect handling, webhook signature verification, payment records, activation, renewal, failed-payment handling, refunds, and reconciliation.
5. **Brevo transactional delivery:** verification, welcome, listing submitted, admin pending, approved/rejected, inquiry received, payment success/failure, expiry, and renewal messages.
6. **Server-side security:** validation, authorization, listing ownership, rate limiting, protected admin routes, secure secrets, upload restrictions, and webhook idempotency.

### P1 — required for a complete business-directory workflow

1. Add WhatsApp and Viber fields and render every provided contact method on listing details.
2. Enforce listing completeness so empty contact/media fields do not produce incomplete published pages.
3. Connect Contact and Newsletter forms to real delivery/subscription endpoints with spam protection and consent records.
4. Build supplier/admin inquiry management, replies, status tracking, and email delivery.
5. Implement the reviews/ratings workflow advertised in the FAQ, or remove the claim until available.
6. Complete admin modules that are still placeholders, including Pages & Content, Settings, and deeper inquiry controls.
7. Add real address search, geocoding, map marker editing, and normalized Philippine location data.
8. Add upload type/size limits, delete/replace lifecycle, malware scanning, and image optimization.

### P2 — quality and scale improvements

1. Full accessibility audit covering keyboard navigation, focus order, labels, errors, and contrast.
2. Cross-browser and device testing across current Chrome, Safari, Firefox, Edge, iOS, and Android.
3. Code splitting and media optimization to reduce the main JavaScript payload.
4. Site-wide broken-link crawl, metadata, sitemap, robots, Open Graph, and directory/listing structured data.
5. Automated regression tests for authentication, listing CRUD, checkout, webhooks, approvals, inquiries, and email workflows.
6. Monitoring, error reporting, backups, privacy retention controls, analytics, and an operational launch runbook.

## Evidence captured

- `01-about-email.png` — newsletter input with a long email address.
- `02-package-faq-before.png` — original package-copy mismatch.
- `03-inquiry-confirmation.png` — successful inquiry UI confirmation.
- `04-public-package-resolved.png` — public single-package page.
- `05-guest-listing-package-notice.png` — guest listing flow with package notice.
- `06-faq-resolved.png` — corrected FAQ copy.
- `07-contact-consent-resolved.png` — corrected consent and legal links.
- `08-mobile-packages.png` — sampled mobile package layout.

## Build verification

- `npm run build` passes.
- Contact page image check found no broken images.
- Public FAQ contains the PHP 999/year plan and guest visibility copy.
- PayMongo and Brevo configuration screens exist, but their production workflows remain incomplete as noted above.
