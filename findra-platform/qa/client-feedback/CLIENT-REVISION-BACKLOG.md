# Findra client revision backlog

**Source:** [Client Google Doc](https://docs.google.com/document/d/1a_mY4yJlhQSqMiXmJa8hCFzfDMlXDv8E43Xeeu62fis/edit?usp=sharing)  
**Staging:** https://staging.findra.ph/  
**Compared against:** `main` @ `2c88eb1`  
**Purpose:** Detailed build list for the remaining Google Doc items. Do not start implementation until the open questions at the bottom are answered.

This is **page-by-page visual and copy feedback**, not the earlier UAT testing checklist (auth, PayMongo, Brevo). Those production foundations stay out of this pass unless a Google Doc item depends on them.

Status key:

- **Build** — still required, or current code does not match the Google Doc.
- **Verify on staging** — code looks partly done; confirm on https://staging.findra.ph/ before treating as closed.
- **Done in code** — present in the current codebase; keep on the list only for client sign-off.
- **Decision needed** — do not build until the question is answered.

---

## 1. Home page

### 1.1 Keyword search box — Build

**Client:** Not suggestive. Search always opens the businesses page, regardless of keyword.

**Current code:** Home search is **intentionally submit-only**. Typeahead is hard-disabled (`showSuggestions = false`). Submit goes to `/listings?search=…` and optionally `category=…`.

**Build in detail:**

1. Restore live suggestions while typing (minimum 2 characters).
2. Match published businesses by name, card title, category, sub-category, city, and services.
3. Each suggestion row: logo/fallback, business name, category, city. Click opens that profile (`/listing/:id`), not the directory.
4. Keep a last row: “See all results for {keyword}” → `/listings?search={keyword}` (and current category if selected).
5. Keyboard: Arrow Up/Down, Enter, Escape. Click-outside closes the list.
6. Empty keyword + Search with no category still goes to `/listings` with no results shown until a filter is chosen (see 2.2).
7. Dark mode: suggestion panel must use dark tokens (previous implementation had a white panel on the dark hero).
8. Width: span keyword + category fields on desktop; full-width when the search stack is vertical.

### 1.2 Business Category dropdown — Verify / Build if broken

**Client:** Any chosen dropdown value opens the same businesses page and shows **all** businesses.

**Current code:** Search writes `?category=` and the directory reads it. Empty placeholder “Business Category” does not send a category.

**Build if staging still dumps all listings:**

1. Selecting a named category must land on `/listings?category={exact name}`.
2. Directory must filter `listing.category ===` that name (the 5 main categories only).
3. Results must stay hidden until a real category, sub-category, service, or keyword is chosen (not `All`).
4. QA with one listing per category so a wrong filter is obvious.

### 1.3 Category tiles — Verify / Build if broken

**Client:** Every tile goes to the same businesses page and shows all businesses.

**Current code:** Each tile already calls `go(/listings?category=…)` with that tile’s name.

**Build if staging is still wrong:** same filter contract as 1.2. Tile names must match the five locked categories exactly.

### 1.4 Featured businesses — Build remaining pieces

**Client:**

- Category under the tagline must be one of the **5 main categories only**. Creating a new category is not allowed.
- Fix description preview **alignment**.
- Set an **allowable character count** on the preview so cards are consistent.

**Current code:** Cards already hide off-taxonomy categories. Listing editor uses a locked 5-category select. Preview is left-aligned and truncated to **120 characters** + 2-line clamp.

**Build:**

1. Confirm public featured cards never print a custom/off-list category (e.g. “Software & Technology”).
2. Keep the five names: Products & Suppliers; Services & Rentals; Professionals; Freelancers & Creatives; Community & Institutions.
3. Description preview: left-aligned, same line-height, **120 characters** (word-break, ellipsis). Change the cap only if the client names a different number.
4. If a listing has no description, do not invent a long generic sentence that blows the cap; use tagline or a short fallback that still respects 120 characters.

### 1.5 Be Discovered box — Build (copy wrap) — Decision needed on line break

**Client:** Adjust text distribution, and showed:

> When visibility means growth,  
> we make sure your business gets noticed by the people who matter

**Current code:** Still forces a `<br />` after “growth,”.

**Build (pending Q1):** Either keep the two-line split exactly as written, or remove the `<br />` and let the sentence wrap inside the existing max-width. Do not change the words.

### 1.6 Footer (Home and every public page) — Build

**Client:** Same footer comments apply on Home and Businesses.

| Item | Client request | Current code | Build |
|---|---|---|---|
| Logo | Bigger and more visible; not the same color as the green footer; **same as old website** (findra.ph) | ~150px `BrandLogo` on green | Enlarge (target ~190–220px). Use the light/white logo on the green bar so it does not blend. Match live findra.ph proportions. |
| Social icons | “Both are pink — make **same as old website**” | Facebook `#1877f2`, Instagram `#df3177` | Match live findra.ph exactly (typically Facebook blue, Instagram magenta/gradient). If staging still renders both pink, fix the shared `.socials` rule so the first icon is not inheriting Instagram pink. |
| Account Login | Take it out | Already absent from the footer | No build. Keep it out. Header Log In / Register stays. |

---

## 2. Businesses page

### 2.1 Breadcrumb — Done in code / verify

**Client:** Page currently shows `Home → Search Results`. Change to `Home → Businesses`.

**Current code:** Already `Home → Businesses`.

**Verify on staging.** If staging still says Search Results, ship the same label.

### 2.2 Empty “All” filters — Done in code / verify

**Client:** Do **not** show matching businesses when Business Type and/or Business Category is `All`.

**Current code:** Results stay empty until category, sub-category, Find a Service text, or keyword is set. Location alone cannot reveal the list.

**Verify on staging.** Keep this behavior.

### 2.3 Location search accuracy — Build

**Client:** Location search is not accurate; all businesses appear regardless of the location typed.

**Current code:** After another filter is set, location is a case-insensitive **substring of the listing address** (first comma segment). That will still show unrelated cities if the string is short or the address is messy.

**Build:**

1. Location stays disabled until category, sub-category, service, or keyword is chosen.
2. Prefer Google Places: store place id / city / province on the listing and match on those fields, not a loose full-address `includes`.
3. If Places is unavailable, match city (and optionally province) tokens only.
4. Empty location = no extra location constraint (still filtered by the other selected fields).
5. Show “Searching near {place}” with a clear control.

### 2.4 Filters — mostly done; finish leftover UX

| Client request | Status | Remaining build |
|---|---|---|
| Remove Business Type | Done in public filters | Confirm it is gone on staging. Keep it out of the public profile. |
| Add Sub-Category under Business Category | Done | Options come from listing-entered sub-categories. See Q7 if they should be admin-managed instead. |
| Rename Business Services → **Find a Service**; filter the right-hand list by the typed keyword | Done | Keep filtering on services + tagline + description. |
| Remove bullet selection under Business Services | Done in code | Verify no chip/radio list remains under Find a Service. |
| Move location under the filters above; only apply after those selections | Done | Mobile: the “Filters” button currently does **not** open a panel. **Build a working mobile filter drawer** so location and the other filters are usable on phone. |

Footer: apply 1.6.

---

## 3. Business profile page

### 3.1 Taxonomy labels — Done in code / verify

- Remove Business Type.
- Label is **Category** (not Business Category).
- Value format: `Business Category / Sub-Category`.
- Example: Events by Ina → `Category: Services & Rentals / Event Coordination, Venues & Rentals`.

**Build if staging still prints Type, or only the main category, or joins sub-categories with the wrong separator.** Multiple sub-categories should appear as `Category: {main} / {sub1}, {sub2}`.

### 3.2 Operating Hours — Done in code / verify

Show **Operating Hours** directly under Business Address when the listing has a value. Hide the row when empty.

### 3.3 About Us — 200 characters — Done in code / verify

Editor `maxLength={200}` with a live counter. Public profile must display the saved 200-character text (no extra generated copy).

### 3.4 Our Services — 3 × 25 characters — Done in code / verify

Max **3** services, **25 characters each**, enforced in the listing editor and when rendering chips on the public profile.

### 3.5 Gallery — 6 photos, click + caption — Done in code / verify

- Max 6 images.
- Click opens a lightbox.
- Caption max **30 characters**, shown in the lightbox.
- Hide caption UI when empty.

### 3.6 Featured video — finish upload path — Build polish

**Client:** Do not limit to YouTube. Allow a direct upload (type + size limit). Preview with a play control like YouTube. Limit to **1** video. Suggest a type/size that will not crash the profile.

**Proposed limits (see Q5):**

| Rule | Proposal |
|---|---|
| Count | 1 featured video (YouTube **or** file, not both) |
| File types | **MP4 (H.264)** primary; **WebM** accepted |
| Max size | **50 MB** (already the server cap) |
| Recommended | 1080p or smaller, ~30–60 seconds |
| Playback | HTML5 `<video controls preload="metadata">` on editor + public profile |

**Remaining build:**

1. File picker currently `accept="video/mp4"` only while the server also allows WebM — align UI, hint, and server.
2. Surface the 50 MB cap in the editor hint (it is easy to miss today).
3. Keep YouTube URL as the alternative, with embed preview.
4. Choosing a file clears the YouTube URL and vice versa.
5. Reject a second video.

### 3.7 Attachment — 1 file — Build polish

**Client:** Limit to 1. Suggest company profile or brochure. Suggest type/size that will not slow the page.

**Proposed limits (see Q6):**

| Rule | Proposal |
|---|---|
| Count | 1 |
| Type | **PDF** only for the brochure/profile |
| Max size | **10 MB** (hint already says 10 MB; upload box still says 12 MB — unify) |
| Public UI | File name + download; do not inline-render PDFs on the profile |

**Remaining build:** Unify the 10 vs 12 MB copy. `accept` is PDF-only; the hint still mentions JPG/PNG — make those match.

### 3.8 Map label — Done in code / verify

Rename **Business Location** → **Business Pin Location**.

### 3.9 Inquiry form and contact buttons — Build remaining product piece

| Client request | Current | Build |
|---|---|---|
| See and track messages between businesses and customers | Business owners have an inquiry inbox with replies. **Admin inbox is contact-form only**; listing threads are described as private to the owner. | See **Q2**. If yes: admin read-only (or reply) view of every listing thread, with business name, customer, timestamps, status. If no: keep owner-only and tell the client where owners manage it (dashboard → inquiries). |
| Accurate redirects (Viber, email, etc.) | Viber uses `viber://chat?number=+…`. Email/website/WhatsApp use standard URLs. Leading `+` must stay on Viber. | QA each button on iOS and Android. Fix any scheme that still strips `+` or opens a blank chat. |
| Buttons only if the channel exists | Call / Email / Website / WhatsApp / Viber already hide when empty. | Verify on a listing that has only some channels filled. |

---

## 4. About page

### 4.1 Mission — copy polish — Build

| Client | Current | Build |
|---|---|---|
| Change “Why the platform exists” → **Core Purpose** | Kicker is `CORE PURPOSE`; heading is still **Why Findra exists** | Make the visible heading **Core Purpose** (or drop the old heading so Core Purpose is the title). |
| Purpose sentence → “To create a simpler, more effective way to discover and showcase businesses in the Philippines.” | Already this sentence | Verify on staging. |
| Retain the three bullets: Too much clutter / Low relevance / Hard to trust | Already those three rows | Keep. |

### 4.2 Brand Values — Build

**Client:** Convert to the **same format as Mission and Vision** (image card + kicker + title + intro + three icon rows).

**Current:** Brand Values still uses the three-up `InfoCards` grid, unlike Mission/Vision.

**Build:** Restyle Brand Values as an `about-image-card` using `FeatureRows` (No Noise, Structured Discovery, Credibility) so Mission, Vision, and Values share one layout.

### 4.3 How it works for seekers — copy polish — Build one line

| Step | Title | Definition to ship |
|---|---|---|
| 1 | Search | Find businesses that match your needs. |
| 2 | Evaluate | Review services and key details to make an informed choice. |
| 3 | Connect | **Connect with businesses that match your needs.** (code currently says “Connect **to**”) |

### 4.4 How it works for businesses — Done in code / verify

| Step | Title | Definition |
|---|---|---|
| 1 | Build Your Profile | Add your business, services, and key details. |
| 2 | (keep current title or leave unlabeled aside from STEP 02) | Your business is found by people based on what you offer and what they’re looking for. |
| 3 | Connect | Make it easy for people to get in touch with your business. |

### 4.5 Newsletter signup — Build admin access

**Client:** Where are emails stored, and how does Findra access them?

**Current:** POST `/api/newsletter/subscribe` writes `newsletter_subscribers` and creates/updates a Brevo contact (optional `BREVO_NEWSLETTER_LIST_ID`). There is **no admin screen** listing signups.

**Build:**

1. Admin → subscribers (or a Newsletter tab): email, source (`about-page`), status, timestamps.
2. Export CSV.
3. Short note on the About form is optional; the client asked for **access**, not more public copy.

---

## 5. Packages

### 5.1 Inclusion list — Done in code / verify

Both cards should list exactly:

1. Dedicated Business Profile  
2. Secure Business Dashboard  
3. SEO-Optimized Business Page  
4. Built-in Inquiry Form and Direct Contact Tools  
5. Location-Based Search  
6. Relevant Category Listing  

### 5.2 Add Basic beside Early Bird — Done in structure; Build differentiation — Decision needed

**Current:** Two-column Basic + Early Bird. Early Bird body copy still says **“Premium placement, priority support, and more — details coming soon.”** while the bullets match Basic. FAQ copy still disagrees (₱799/month vs ₱999/year).

**Build after Q3 / Q4:**

1. Put the agreed prices, interval, and CTA on each card.
2. If Early Bird is the same product at a promo price, say that clearly (who qualifies, when it ends).
3. If Early Bird has extra benefits, list them — do not leave “coming soon” on a live checkout card.
4. Align FAQ + checkout + admin packages with the same two names and prices.

---

## 6. Contact Us

### 6.1 Copy — Done in code / verify

- Remove “How Can We Help?”
- Remove “Have a question about Findra, your business listing, or how the platform works? Our team is here to help.”
- Keep “Reach out anytime and we’ll get back to you as soon as possible.”

**Current heading is “We’re here to help.”** Confirm that replacement is acceptable.

### 6.2 Where messages go — Done in plumbing; Build discoverability

**Current:** Contact form POST `/api/inquiries` with no listing → `target = admin`. Admin dashboard inquiries show website contact-form messages. Listing inquiries stay on the business owner inbox.

**Build:**

1. Make the admin view obviously labeled (Website contact vs listing inquiry).
2. Email the admin on each contact-form submit (Brevo template already has an inbox-message path — confirm it fires).
3. Status + reply from admin, same as listing inquiries.
4. Optional one-line admin help text so Findra staff know this is the answer to “where do the messages go?”

---

## 7. Legal & Policies

**Client:** All good.

**No build.** Do not edit legal copy in this pass.

---

## 8. FAQ

**The Google Doc heading is empty** (no bullets).

**Do not invent FAQ rewrites in this pass** except:

- If Packages prices/names change, the two pricing answers must be updated in the same PR so they do not contradict the Packages page.

---

## Suggested implementation order

1. Decisions Q1–Q7 below.  
2. Home search suggestions + category/tile QA.  
3. Footer logo and socials (site-wide).  
4. Be Discovered wrap.  
5. Businesses location matching + mobile filter drawer.  
6. Profile media polish (video/attachment hints and accept lists).  
7. About Values layout + Core Purpose heading + “Connect with”.  
8. Newsletter admin list.  
9. Packages/FAQ price alignment.  
10. Admin contact-message labeling (+ optional listing-thread visibility).  
11. Staging pass against every checkbox in this file.

---

## Questions to answer before we build

**Q1. Be Discovered line break**  
Google Doc shows a hard two-line split after “growth,”. Live findra.ph lets the sentence wrap. Which should staging match?

**Q2. Inquiry visibility**  
Should **Findra admin** see and reply to business ↔ customer listing threads, or only the public Contact Us form? Owners already have their own inbox.

**Q3. Early Bird vs Basic**  
What is the price and billing period for each? What is actually different (placement, support, duration, first-100 cap)? Can we remove “details coming soon”?

**Q4. FAQ pricing**  
The Google Doc has no FAQ notes, but the site currently says **₱799/month** in General FAQ and **₱999/year** in Supplier FAQ, while Packages shows Early Bird + Basic. Which numbers and names are official?

**Q5. Featured video limits**  
OK to ship **MP4 + WebM, 50 MB, one file, YouTube still allowed**? Any max duration (e.g. 60 seconds)?

**Q6. Attachment limits**  
OK to ship **one PDF, 10 MB**, company profile/brochure only (no Word, no extra images)?

**Q7. Sub-categories**  
Keep them as free-typed values on the listing (current), or should admin predefine the sub-category list per main category?

**Q8. Keyword search intent**  
Confirm the Google Doc “not suggestive” means **add autocomplete**, not remove it. Current staging/code has suggestions turned **off**.

**Q9. Keyword-only directory search**  
Client said do not show businesses when category is `All`. Is typing a keyword (or Find a Service) enough to reveal results, or must a real category always be chosen first?

**Q10. About heading “We’re here to help.”**  
Contact hero currently uses that instead of “How Can We Help?”. Keep it, or use only the remaining sentence with no H2?

**Q11. Newsletter**  
Is an in-app admin table enough, or must staff also get a shared Brevo list / CSV email on each signup?

**Q12. Footer reference**  
Please confirm live https://findra.ph/ is the visual source for footer logo size and social colors.

---

## Out of scope for this Google Doc pass

Unless you say otherwise, this pass will **not** include: production auth email-verification/reset, PayMongo live cutover, Brevo template QA for every lifecycle email, reviews/ratings (still claimed in FAQ), or a full device lab. Those belong to the older UAT checklist, not this document.
