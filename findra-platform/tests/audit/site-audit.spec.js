import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  PUBLIC_PATHS,
  attachListeners,
  collectPageSignals,
  emptyPageResult,
  finalizePage,
  writeAuditReport,
} from "./helpers.mjs";

const pages = [];
const extras = { links: [], checks: [] };

async function auditPath(context, path, viewport) {
  const result = emptyPageResult(path, viewport);
  const page = await context.newPage();
  attachListeners(page, result);
  try {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    result.status = response?.status() ?? null;
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
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
  } finally {
    await page.close();
  }
  pages.push(finalizePage(result));
  return result;
}

test("audit public findra.ph pages", async ({ context }, testInfo) => {
  test.setTimeout(180_000);
  const viewport = testInfo.project.name.includes("mobile") ? "mobile" : "desktop";
  for (const path of PUBLIC_PATHS) {
    await auditPath(context, path, viewport);
  }
  expect(pages.filter((item) => item.viewport === viewport).length).toBeGreaterThanOrEqual(
    PUBLIC_PATHS.length,
  );
});

test("crawl first-party links and listing detail", async ({ page, request, context, baseURL }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop crawl only");
  test.setTimeout(120_000);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const hrefs = await page.evaluate((origin) => {
    const urls = [...document.querySelectorAll("a[href]")]
      .map((anchor) => anchor.href)
      .filter((href) => href.startsWith(origin) && !href.includes("#"));
    return [...new Set(urls)];
  }, new URL(baseURL).origin);

  for (const href of hrefs.slice(0, 25)) {
    try {
      const response = await request.get(href, { maxRedirects: 5, timeout: 15_000 });
      extras.links.push({ href, from: "/", status: response.status() });
    } catch (error) {
      extras.links.push({ href, from: "/", status: 0, error: error.message });
    }
  }

  let listingPath = "";
  try {
    const listings = await request.get("/api/listings", { timeout: 15_000 });
    if (listings.ok()) {
      const payload = await listings.json();
      const first = (payload.listings || []).find((item) => item.id);
      if (first?.id) listingPath = `/listing/${first.id}`;
    }
  } catch {
    listingPath = "";
  }

  if (!listingPath) {
    await page.goto("/listings", { waitUntil: "domcontentloaded" });
    const viewBusiness = page.locator("button.listing-card-detail").first();
    if (await viewBusiness.count()) {
      await viewBusiness.click();
      await page.waitForTimeout(500);
      listingPath = new URL(page.url()).pathname;
    }
  }

  if (listingPath && listingPath.startsWith("/listing/")) {
    await auditPath(context, listingPath, "desktop");
    extras.checks.push({
      ok: true,
      name: "Listing detail discovery",
      detail: `Opened ${listingPath}`,
    });
  } else {
    extras.checks.push({
      ok: false,
      name: "Listing detail discovery",
      detail: "No published listing id or View business control found",
    });
  }
});

test("product checks on live homepage and packages", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop product checks only");

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  extras.checks.push({
    ok: (await page.locator('a[href="https://www.instagram.com/findra.ph/"]').count()) > 0,
    name: "Instagram footer link",
    detail: "Footer should point to https://www.instagram.com/findra.ph/",
  });
  extras.checks.push({
    ok: (await page.locator('a[href="mailto:hello@findra.ph"]').count()) > 0,
    name: "Support email",
    detail: "Public chrome should expose hello@findra.ph",
  });
  extras.checks.push({
    ok: (await page.locator('a[href*="facebook.com/findraph"]').count()) > 0,
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
  await page.waitForFunction(
    () => /Early Bird|Basic|799|999|being updated|Loading packages/i.test(document.body.innerText),
    { timeout: 10_000 },
  ).catch(() => {});
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const packagesReady = /Early Bird|Basic|799|999/i.test(body);
  extras.checks.push({
    ok: packagesReady,
    name: "Packages visible to guests",
    detail: packagesReady
      ? "Guest packages page shows pricing copy"
      : /being updated/i.test(body)
        ? "Packages page shows 'being updated' — live /api/packages returned no active Basic/Early Bird plans"
        : "Could not find Early Bird / Regular pricing on /packages",
  });

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  extras.checks.push({
    ok: (await page.locator('input[type="email"], input[name="email"]').count()) > 0,
    name: "Login form",
    detail: "Login page should expose an email field",
  });
});

test.afterAll(() => {
  if (!pages.length && !extras.checks.length) return;
  writeAuditReport({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "https://findra.ph",
    generatedAt: new Date().toISOString(),
    pages,
    extras,
  });
});
