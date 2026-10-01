# Findra.ph Playwright audit

**Target:** https://findra.ph
**Generated:** 2026-08-15T19:21:54.453Z
**Runner:** [@playwright/test](https://github.com/microsoft/playwright) Chromium

## Summary

| Severity | Count |
|---|---|
| P0 load / HTTP failures | 0 |
| P1 console, broken assets, a11y serious+ | 13 |
| P2 overflow, missing alt, warnings | 4 |

## P0 — pages that did not load cleanly

None found.

## P1 — functional / console / serious accessibility

- / [desktop] has 2 serious/critical axe violation(s)
- /listings [desktop] has 2 serious/critical axe violation(s)
- /about [desktop] has 1 serious/critical axe violation(s)
- /packages [desktop] has 1 serious/critical axe violation(s)
- /faq [desktop] has 1 serious/critical axe violation(s)
- /add-listing [desktop] has 1 serious/critical axe violation(s)
- /listing/12 [desktop] has 4 serious/critical axe violation(s)
- / [mobile] has 2 serious/critical axe violation(s)
- /listings [mobile] has 1 serious/critical axe violation(s)
- /about [mobile] has 1 serious/critical axe violation(s)
- /packages [mobile] has 1 serious/critical axe violation(s)
- /faq [mobile] has 1 serious/critical axe violation(s)
- /add-listing [mobile] has 1 serious/critical axe violation(s)

## P2 — polish

- / [desktop] 8 image(s) missing alt
- /listing/12 [desktop] 1 image(s) missing alt
- / [mobile] 8 image(s) missing alt
- 19 public page(s) called /api/auth/session and received 401 (expected for guests)

## Page results

### `/` (desktop)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: Your go-to place to find the business for your needs.Your go-to place tofind the businessfor your needs.
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 8
- Horizontal overflow: no
- axe violations: 2
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session
- Accessibility:
  - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (3 nodes)
  - [critical] select-name: Select element must have an accessible name (1 nodes)

### `/listings` (desktop)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: Find the right partner foryour next project.
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 2
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session
- Accessibility:
  - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (1 nodes)
  - [critical] select-name: Select element must have an accessible name (2 nodes)

### `/about` (desktop)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: ABOUT FINDRA
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 1
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session
- Accessibility:
  - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (6 nodes)

### `/packages` (desktop)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: BUSINESS LISTING PACKAGES
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 1
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session
- Accessibility:
  - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (1 nodes)

### `/contact` (desktop)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: CONTACT US
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 0
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session

### `/faq` (desktop)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: FREQUENTLY ASKED QUESTIONS
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 1
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session
- Accessibility:
  - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (3 nodes)

### `/legal` (desktop)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: LEGAL & POLICIES
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 0
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session

### `/login` (desktop)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: Get discovered with Findra.
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 0
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session

### `/add-listing` (desktop)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: Add New Business
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 1
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session
- Accessibility:
  - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (3 nodes)

### `/listing/12` (desktop)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: AiFunnels
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 1
- Horizontal overflow: no
- axe violations: 4
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session
- Accessibility:
  - [critical] aria-allowed-attr: Elements must only use supported ARIA attributes (1 nodes)
  - [serious] aria-prohibited-attr: Elements must only use permitted ARIA attributes (1 nodes)
  - [critical] button-name: Buttons must have discernible text (1 nodes)
  - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (1 nodes)

### `/` (mobile)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: Your go-to place to find the business for your needs.Your go-to place tofind the businessfor your needs.
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 8
- Horizontal overflow: no
- axe violations: 2
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session
- Accessibility:
  - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (3 nodes)
  - [critical] select-name: Select element must have an accessible name (1 nodes)

### `/listings` (mobile)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: Find the right partner foryour next project.
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 1
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session
- Accessibility:
  - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (1 nodes)

### `/about` (mobile)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: ABOUT FINDRA
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 1
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session
- Accessibility:
  - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (6 nodes)

### `/packages` (mobile)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: BUSINESS LISTING PACKAGES
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 1
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session
- Accessibility:
  - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (1 nodes)

### `/contact` (mobile)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: CONTACT US
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 0
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session

### `/faq` (mobile)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: FREQUENTLY ASKED QUESTIONS
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 1
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session
- Accessibility:
  - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (3 nodes)

### `/legal` (mobile)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: LEGAL & POLICIES
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 0
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session

### `/login` (mobile)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: Get discovered with Findra.
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 0
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session

### `/add-listing` (mobile)

- HTTP: 200
- Title: Findra — Find the right partner, fast.
- H1: Add New Business
- Console errors: 1
- Failed requests: 1
- Broken images: 0
- Missing alt: 0
- Horizontal overflow: no
- axe violations: 1
- Errors:
  - Failed to load resource: the server responded with a status of 401 ()
- Failed requests:
  - 401 https://findra.ph/api/auth/session
- Accessibility:
  - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (3 nodes)

## Internal link crawl

- 200 `https://findra.ph/` (from /)
- 200 `https://findra.ph/listings` (from /)
- 200 `https://findra.ph/about` (from /)
- 200 `https://findra.ph/packages` (from /)
- 200 `https://findra.ph/contact` (from /)
- 200 `https://findra.ph/login` (from /)
- 200 `https://findra.ph/legal` (from /)
- 200 `https://findra.ph/faq` (from /)

## Product checks

- PASS — Listing detail discovery: Opened /listing/12
- PASS — Instagram footer link: Footer should point to https://www.instagram.com/findra.ph/
- PASS — Support email: Public chrome should expose hello@findra.ph
- PASS — Facebook footer link: Footer should point to the Findra Facebook page
- PASS — Theme toggle: theme went from dark to light
- PASS — Packages visible to guests: Guest packages page shows pricing copy
- PASS — Login form: Login page should expose an email field

