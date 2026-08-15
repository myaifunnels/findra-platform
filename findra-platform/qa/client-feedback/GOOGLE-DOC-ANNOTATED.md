# Findra website revision — annotated client document

**Source:** [Client Google Doc](https://docs.google.com/document/d/1a_mY4yJlhQSqMiXmJa8hCFzfDMlXDv8E43Xeeu62fis/edit?usp=sharing)  
**Response date:** 15 August 2026  
**Live site:** https://findra.ph  
**How to use:** Copy this outline back into the Google Doc. Original client wording is unchanged. Each item has a Findra status and short response.

Status key:

- **FIXED** — shipped on `main` / findra.ph
- **PARTIAL** — mostly shipped; remaining gap noted
- **RESPONSE** — answered; no extra UI change in this round
- **OPEN** — not shipped yet (or waiting on listing data / a follow-up PR)

---

## HOME PAGE

- Keyword search box
  - Not suggestive
  - Leads to businesses page only regardless of keyword  
    **FIXED.** Home keyword field has no typeahead. Search / Enter goes to `/listings?search=…` (and `category=` when a category is selected). It does not jump straight to a single profile.

- Business Category dropdown
  - Any chosen dropdown leads to the same business page. Showing all businesses instead of the selected category only.  
    **FIXED.** Choosing a named category lands on `/listings?category={name}` and the directory filters to that main category only. The empty “Business Category” placeholder does not send a category.

- Category Tiles
  - All selection leads to the same business page. Showing all businesses instead of the selected category only.  
    **FIXED.** Each tile’s See More goes to `/listings?category={tile name}` using the five locked main categories.

- Featured Businesses
  - Category under tagline must be limited to the 5 main categories only. Creation of new category is not allowed.  
    **FIXED.** Public featured cards and the listing editor only use: Products & Suppliers; Services & Rentals; Professionals; Freelancers & Creatives; Community & Institutions. New top-level categories cannot be created from the public site.
  - Fix business description preview - text alignment  
    **FIXED.** Preview text is left-aligned.
  - Fix business description preview - set allowable character for the business description preview for consistency  
    **FIXED.** Preview is capped at **120 characters**, word-broken, with a 2-line clamp and ellipsis.

- Be Discovered Box - adjust text distribution

‘When visibility means growth,  
we make sure your business gets noticed by the people who matter’

    **FIXED.** The box uses this two-line split (break after “growth,”). Words were not changed. CTA: Showcase Your Business → `/packages`.

- Footer
  - Make logo bigger and more visible (not same color as the background) - SAME AS OLD WEBSITE  
    **FIXED.** Public footer uses a larger white Findra wordmark on the green bar (high contrast, matching the old website).
  - Social media icons are both pink - please make SAME AS OLD WEBSITE  
    **FIXED.** Facebook is brand blue; Instagram is magenta. Links: Facebook `findraph`, Instagram `findra.ph`.
  - Take out ‘Account Login’  
    **FIXED.** Footer has no Account Login. Header still has Log In / Register.

---

## BUSINESSES PAGE

- Breadcrumb Trail
  - Please make it consistent, in the businesses page it shows Home → Search Results (instead of) Home → Businesses  
    **FIXED.** Breadcrumb is **Home → Businesses**.

- Don’t show matching businesses when ‘Business Type’ AND/OR ‘Business Category’ is set to All  
    **FIXED.** Results stay hidden until a real filter is active: Business Category ≠ All, Sub-Category ≠ All, keyword, or Find a Service. Location alone does not reveal the list. Helper copy: “Pick a category, sub-category, service, or keyword above to find matching businesses.”

- Location search is not accurate, all businesses appears regardless of specific location search  
    **FIXED.** Location is disabled until a category / sub-category / service / keyword is chosen. After that it matches the city/area token against listing location, not every listing. Active state shows “Searching near {place}” with Clear.

- Filters
  - Remove ‘Business Type’  
    **FIXED.** Removed from public directory filters and from the public profile.
  - Add ‘Sub-Category’ (below ‘Business Category)  
    **FIXED.** Sub-Category sits under Business Category. Options come from published listings in the selected category.
  - Change title of ‘Business Services’ search to ‘Find a Service’ - filter businesses appearing on the right based on keyword type  
    **FIXED.** Field title is **Find a Service**. It filters the result list by the typed service/keyword.
  - Remove bullet selection below ‘Business Services’ search box  
    **FIXED.** No chip/radio/bullet list under Find a Service.
  - Move location search here - location filter only applies when the selections above were made - it is no use to search by location without identifying first what services is needed  
    **FIXED.** Location sits under the filters above and only applies after a need is identified.

- Footer - PLEASE APPLY SAME COMMENT FROM HOME  
    **FIXED.** Same shared public footer (white logo, brand socials, no Account Login).

---

## BUSINESSES PROFILE PAGE

- Remove ‘Business Type’  
    **FIXED.** Not shown on the public profile.

- Change ‘Business Category’ to ‘Category’ only  
    **FIXED.** Label is **Category:**
  - This should return Business Category / Sub-Category, in the case of Events by Ina this must show  
    Category: Services & Rentals / Event Coordination, Venues & Rentals  
    **PARTIAL / data.** Format is `Category: {main} / {sub1}, {sub2}` when sub-categories are saved. Events by Ina will show that example only after those sub-categories (and hours, if requested) are stored on the listing. Code is ready.

- Add ‘Operating Hours’ below Business Address  
    **FIXED** when hours exist (row sits under Business Address). Hidden when the listing has no hours so the profile does not show an empty field. (A follow-up can always show “Not provided” if you prefer that.)

- Limit “About Us” to 200 characters  
    **FIXED** in the listing editor (`maxLength` 200 + live counter). Public profile renders the saved text. Older listings that were saved before the cap may still be longer until they are re-saved.

- Limit ‘Our Services’ to 3 services; Maximum of 25 characters per service  
    **FIXED** in the listing editor. Public profile shows the saved services (max 3 × 25).

- Limit ‘Gallery’ to 6 photos with option to click on each photo and show caption. Caption per photo should be limited to 30 characters  
    **FIXED.** Max 6 photos. Click opens a lightbox with caption, prev/next, and close. Caption max **30 characters**. Empty captions are hidden.

- Can featured video not be limited to youtube only? Can they upload other video formats directly provided it meets the type and file size limit. If possible, the video should also show a preview and play button like when a YouTube link is used.  
    **FIXED + RESPONSE.** Featured video can be a public YouTube URL **or** one uploaded **MP4 (H.264)** with an HTML5 player (preview + play/controls), not YouTube-only.

- Limit ‘Featured’ video to 1 video only; please suggest an optimized file type and file size limit that won’t make the business profile page crash (and the website to not slow down).  
    **FIXED + RESPONSE.** Limit is **1 video** (YouTube or file, not both).  
    **Suggested limit:** MP4 H.264, **up to 50 MB**, **720p** (or smaller), roughly 30–60 seconds. WebM is accepted on the server; the editor prefers MP4 so pages stay light.

- Limit ‘Attachment’ to 1 attachment only; Suggest company profile or brochure; please suggest an optimized file type and file size limit that won’t make the business profile page crash (and the website to not slow down)  
    **FIXED + RESPONSE.** Limit is **1 attachment**.  
    **Suggested:** company profile or brochure as **PDF, JPG, or PNG, up to 12 MB**. Word `.doc` / `.docx` are not accepted (they are heavier and less safe to open in-browser).

- Change “Business Location” to Business Pin Location”  
    **FIXED.** Section title is **Business Pin Location**, with map + Open in Google Maps.

- Inquiry Form
  - Can we see and track the messages between the businesses and their customers?  
    **PARTIAL / RESPONSE.** Inquiries are captured in the product (listing inquiry form → stored records; owners can see their inquiries). A full two-way chat thread UI is **not** in this round. Contact Us messages also land as inquiries for the Findra team. Admin-wide inquiry visibility is a follow-up if you want one inbox for every business.
  - Ensure accurate re-directing using the different platforms (eg viber, email, etc.)  
    **FIXED.** WhatsApp uses `https://wa.me/<digits>` (PH `09…` numbers are normalized to +63). Viber uses `viber://chat?number=+<digits>`. Email/website/social use the saved URLs.
  - Button for other platforms (eg viber, whatsapp, etc) will only appear if it is available  
    **FIXED.** Call / Email / WhatsApp / Viber / Website / Facebook / Instagram / LinkedIn buttons render only when that field is filled.

---

## ABOUT PAGE

- Mission
  - Change “Why the platform exists” to “Core Purpose”  
    **FIXED.** Kicker is **CORE PURPOSE**. Heading remains “Why Findra exists.”
  - Change “To make the discovery and showcasing of businesses in the Philippines effortless and noise-free.” to “To create a simpler, more effective way to discover and showcase businesses in the Philippines.”  
    **FIXED.** Live copy matches the requested sentence.
  - Retain bullet points - too much clutter, low relevance, hard to trust  
    **FIXED / RESPONSE.** The three supporting rows are kept (Too Much Clutter / Low Relevance / Hard to Trust) because they name the problems Findra removes.

- Brand Values
  - Convert the format similar to Mission and Vision format  
    **PARTIAL.** Copy is locked (No Noise, Structured Discovery, Credibility). Layout is still the shared info-card treatment; matching Mission/Vision image-card chrome is in a follow-up PR.

- How it works for seekers
  - Step 1 — Retain “Search”; Change definition to “Find businesses that match your needs.”  
    **FIXED.**
  - Step 2 — Change title to “Evaluate”; Change definition to “Review services and key details to make an informed choice.”  
    **FIXED.**
  - Step 3 — Retain “Connect”; Change definition to “Connect with businesses that match your needs.”  
    **OPEN (one-word polish).** Live copy currently says “Connect **to** businesses…”. Approved line is “Connect **with** businesses…”.

- How it works for businesses
  - Step 1 — Change title to “Build Your Profile”; Change description to “Add your business, services, and key details.”  
    **FIXED.**
  - Step 2 — Change description to “Your business is found by people based on what you offer and what they’re looking for.”  
    **FIXED.**
  - Step 3 — Change title to “Connect”; Change definition to “Make it easy for people to get in touch with your business.”  
    **FIXED.**

- Questions on email signup
  - Where do the emails get stored and how to access them  
    **RESPONSE.** About-page signup posts to `/api/newsletter/subscribe` with `source: "about-page"`. Addresses are stored in Findra’s database (`newsletter_subscribers`) and, when a Brevo List ID is set under **Admin → Integrations → Brevo**, also synced to that Brevo list. Access: Admin Integrations (Brevo) and the database / Brevo dashboard. No public subscriber list.

---

## PACKAGES

- Change inclusion points to
  - Dedicated Business Profile
  - Secure Business Dashboard
  - SEO-Optimized Business Page
  - Built-in Inquiry Form and Direct Contact Tools
  - Location-Based Search
  - Relevant Category Listing  
    **FIXED.** These six bullets are the default inclusions on both Basic cards.

- Add another basic package, side by side to Early Bird  
    **FIXED.** Two guest-visible Basic cards, side by side: **Basic — Regular Pricing** (₱999/month) and **Basic — Early Bird Offer** (₱799/month), both 6 months locked in. Early Bird can show remaining slots or Sold out. No account required to view or to start listing details.

---

## CONTACT US

- Remove ‘How Can We Help?’  
    **FIXED.** Removed.

- Remove ‘Have a question about Findra, your business listing, or how the platform works? Our team is here to help.’ but leave ‘Reach out anytime and we’ll get back to you as soon as possible.’  
    **FIXED.** Intro is only: “Reach out anytime and we’ll get back to you as soon as possible.”

- Where do the messages go and how can we manage it?  
    **RESPONSE.** The form POSTs to `/api/inquiries` and then shows `/contact/thank-you`. Messages are stored as inquiries for the Findra team to manage in the product backend. This round does not add a public ticket portal.

---

## LEGAL & POLICIES

- All good  
    **RESPONSE.** No visual change. Contact email stays `hello@findra.ph` (not `info@findra.ph`).

---

## FAQ

*(This section was empty in the Google Doc.)*

    **RESPONSE.** Public FAQ at `/faq` is already aligned with this revision:
    - Seekers use Findra free.
    - Businesses: Early Bird ₱799/month or Regular ₱999/month, both locked in for 6 months; remaining Early Bird slots shown on Packages before register/checkout.
    - Guests can view Packages and start a listing before creating an account.
    - No extra FAQ redesign was specified in the brief.

---

## Still open (do not treat as fully signed off)

1. Full two-way customer–business message threads.
2. About seeker step 3: “Connect with” vs current “Connect to”.
3. Brand Values visual chrome matching Mission/Vision image cards.
4. Listing data for the Events by Ina category/hours example.
5. Optional: always show Operating Hours as “Not provided” when empty.
