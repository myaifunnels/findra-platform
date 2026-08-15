import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  PUBLIC_PATHS,
  attachListeners,
  collectPageSignals,
  emptyPageResult,
  uniqueByUrl,
  writeAuditReport,
} from "./helpers.mjs";

const pages = [];
const extras = { links: [], checks: [] };

test.describe.configure({ mode: "serial" });

test("audit public findra.ph pages", async ({ page, baseURL }, testInfo) => {
  const viewport = testInfo.project.name.includes("mobile") ? "mobile" : "desktop";

  for (const path of PUBLIC_PATHS) {
    const result = emptyPageResult(path, viewport);
    attachListeners(page, result);

    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    result.status = response?.status() ?? null;
    await page.waitForTimeout(800);
    await collectPageSignals(page, result);

    try {
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      result.axeViolations = axe.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.length,
      }));
    } catch (error) {
      result.notes.push(`axe skipped: ${error.message}`);
    }

    result.consoleErrors = uniqueByUrl(result.consoleErrors);
    result.consoleWarnings = uniqueByUrl(result.consoleWarnings);
    result.failedRequests = uniqueByUrl(result.failedRequests);
    pages.push(result);
  }

  expect(pages.filter((item) => item.viewport === viewport).length).toBe(PUBLIC_PATHS.length);
});

test("crawl first-party links and listing detail", async ({ page, request, baseURL }, testInfo) => {
  const viewport = testInfo.project.name.includes("mobile") ? "mobile" : "desktop";
  if (viewport !== "desktop") test.skip();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const hrefs = await page.evaluate((origin) => {
    const urls = [...document.querySelectorAll("a[href]")]
      .map((anchor) => anchor.href)
      .filter((href) => href.startsWith(origin));
    return [...new Set(urls)];
  }, new URL(baseURL).origin);

  for (const href of hrefs.slice(0, 40)) {
    const response = await request.get(href, { maxRedirects: 5 });
    extras.links.push({ href, from: "/", status: response.status() });
  }

  await page.goto("/listings", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const listingHref = await page.locator('a[href*="/listing/"]').first().getAttribute("href");
  if (listingHref) {
    const result = emptyPageResult(listingHref, "desktop");
    attachListeners(page, result);
    const response = await page.goto(listingHref, { waitUntil: "domcontentloaded" });
    result.status = response?.status() ?? null;
    await page.waitForTimeout(800);
    await collectPageSignals(page, result);
    pages.push(result);
  } else {
    extras.checks.push({
      ok: false,
      name: "Listing detail discovery",
      detail: "No /listing/:id links found on /listings",
    });
  }
});

test("product checks on live homepage and packages", async ({ page }, testInfo) => {
  if (testInfo.project.name.includes("mobile")) test.skip();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  extras.checks.push({
    ok: await page.locator('a[href="https://www.instagram.com/findra.ph/"]').count().then((n) => n > 0),
    name: "Instagram footer link",
    detail: "Footer should point to https://www.instagram.com/findra.ph/",
  });
  extras.checks.push({
    ok: await page.locator('a[href="mailto:hello@findra.ph"]').count().then((n) => n > 0),
    name: "Support email",
    detail: "Public chrome should expose hello@findra.ph",
  });
  extras.checks.push({
    ok: await page.locator('a[href="https://www.facebook.com/findraph/?_rdc=1&_rdr#"]').count().then((n) => n > 0),
    name: "Facebook footer link",
    detail: "Footer should point to the Findra Facebook page",
  });

  const before = await page.evaluate(() => document.documentElement.dataset.theme || "dark");
  await page.locator("header .theme-toggle").first().click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  extras.checks.push({
    ok: Boolean(after) && after !== before,
    name: "Theme toggle",
    detail: `theme went from ${before} to ${after || "(unset)"}`,
  });

  await page.goto("/packages", { waitUntil: "domcontentloaded" });
  const body = (await page.locator("main, body").first().innerText()).replace(/\s+/g, " ");
  extras.checks.push({
    ok: /799|999|Early Bird|Basic/i.test(body),
    name: "Packages visible to guests",
    detail: /799|999|Early Bird|Basic/i.test(body)
      ? "Guest packages page shows pricing copy"
      : "Could not find Early Bird / Regular pricing on /packages",
  });

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  extras.checks.push({
    ok: await page.locator('input[type="email"], input[name="email"]').count().then((n) => n > 0),
    name: "Login form",
    detail: "Login page should expose an email field",
  });
});

test.afterAll(() => {
  if (!pages.length) return;
  writeAuditReport({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "https://findra.ph",
    generatedAt: new Date().toISOString(),
    pages,
    extras,
  });
});
