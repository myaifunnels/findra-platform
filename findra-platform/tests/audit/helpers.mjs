import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const REPORT_DIR = join(root, "qa/playwright-audit");

export const PUBLIC_PATHS = [
  "/",
  "/listings",
  "/about",
  "/packages",
  "/contact",
  "/faq",
  "/legal",
  "/login",
  "/add-listing",
];

export function emptyPageResult(path, viewport) {
  return {
    path,
    viewport,
    status: null,
    title: "",
    heading: "",
    consoleErrors: [],
    consoleWarnings: [],
    failedRequests: [],
    brokenImages: [],
    missingAlt: [],
    overflow: false,
    overflowWidth: 0,
    axeViolations: [],
    notes: [],
  };
}

export async function collectPageSignals(page, result) {
  result.title = await page.title();
  result.heading = (
    await page.locator("h1").first().textContent().catch(() => "")
  )
    ?.replace(/\s+/g, " ")
    .trim();

  result.brokenImages = await page.evaluate(() =>
    [...document.images]
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src)
      .filter(Boolean),
  );

  result.missingAlt = await page.evaluate(() =>
    [...document.images]
      .filter((img) => !(img.getAttribute("alt") ?? "").length)
      .map((img) => img.currentSrc || img.src)
      .filter(Boolean),
  );

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  result.overflowWidth = overflow.scrollWidth;
  result.overflow = overflow.scrollWidth > overflow.clientWidth + 2;
}

export function attachListeners(page, result) {
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") result.consoleErrors.push(text);
    if (msg.type() === "warning") result.consoleWarnings.push(text);
  });
  page.on("pageerror", (error) => {
    result.consoleErrors.push(error.message);
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      result.failedRequests.push({
        url: response.url(),
        status,
      });
    }
  });
}

export function uniqueByUrl(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = typeof item === "string" ? item : `${item.status}:${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function writeAuditReport({ baseURL, generatedAt, pages, extras }) {
  mkdirSync(REPORT_DIR, { recursive: true });
  const file = join(REPORT_DIR, "latest-report.json");
  let mergedPages = pages;
  let mergedExtras = extras;
  if (existsSync(file)) {
    try {
      const prev = JSON.parse(readFileSync(file, "utf8"));
      const age = Date.now() - new Date(prev.generatedAt).getTime();
      if (prev.baseURL === baseURL && Number.isFinite(age) && age < 30 * 60 * 1000) {
        mergedPages = [...(prev.pages || []), ...pages];
        mergedExtras = {
          links: [...(prev.extras?.links || []), ...(extras?.links || [])],
          checks: [...(prev.extras?.checks || []), ...(extras?.checks || [])],
        };
      }
    } catch {
      // Replace a corrupt previous report instead of failing the audit run.
    }
  }
  const payload = {
    baseURL,
    generatedAt,
    pages: mergedPages.map(finalizePage),
    extras: mergedExtras,
  };
  writeFileSync(file, JSON.stringify(payload, null, 2));
  writeFileSync(join(REPORT_DIR, "latest-report.md"), toMarkdown(payload));
}

function toMarkdown(payload) {
  const lines = [
    "# Findra.ph Playwright audit",
    "",
    `**Target:** ${payload.baseURL}`,
    `**Generated:** ${payload.generatedAt}`,
    `**Runner:** [@playwright/test](https://github.com/microsoft/playwright) Chromium`,
    "",
    "## Summary",
    "",
  ];

  const issues = summarize(payload.pages, payload.extras);
  lines.push(`| Severity | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| P0 load / HTTP failures | ${issues.p0.length} |`);
  lines.push(`| P1 console, broken assets, a11y serious+ | ${issues.p1.length} |`);
  lines.push(`| P2 overflow, missing alt, warnings | ${issues.p2.length} |`);
  lines.push("");

  const sections = [
    ["P0 — pages that did not load cleanly", issues.p0],
    ["P1 — functional / console / serious accessibility", issues.p1],
    ["P2 — polish", issues.p2],
  ];
  for (const [title, items] of sections) {
    lines.push(`## ${title}`, "");
    if (!items.length) {
      lines.push("None found.", "");
      continue;
    }
    for (const item of items) lines.push(`- ${item}`);
    lines.push("");
  }

  lines.push("## Page results", "");
  for (const page of payload.pages) {
    lines.push(`### \`${page.path}\` (${page.viewport})`);
    lines.push("");
    lines.push(`- HTTP: ${page.status ?? "n/a"}`);
    lines.push(`- Title: ${page.title || "(empty)"}`);
    lines.push(`- H1: ${page.heading || "(none)"}`);
    lines.push(`- Console errors: ${page.consoleErrors.length}`);
    lines.push(`- Failed requests: ${page.failedRequests.length}`);
    lines.push(`- Broken images: ${page.brokenImages.length}`);
    lines.push(`- Missing alt: ${page.missingAlt.length}`);
    lines.push(`- Horizontal overflow: ${page.overflow ? "yes" : "no"}`);
    lines.push(`- axe violations: ${page.axeViolations.length}`);
    if (page.consoleErrors.length) {
      lines.push("- Errors:");
      for (const error of uniqueByUrl(page.consoleErrors).slice(0, 8)) {
        lines.push(`  - ${sanitize(error)}`);
      }
    }
    if (page.failedRequests.length) {
      lines.push("- Failed requests:");
      for (const req of uniqueByUrl(page.failedRequests).slice(0, 8)) {
        lines.push(`  - ${req.status} ${req.url}`);
      }
    }
    if (page.axeViolations.length) {
      lines.push("- Accessibility:");
      for (const violation of page.axeViolations.slice(0, 8)) {
        lines.push(
          `  - [${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes} nodes)`,
        );
      }
    }
    lines.push("");
  }

  if (payload.extras?.links?.length) {
    lines.push("## Internal link crawl", "");
    for (const link of payload.extras.links) {
      lines.push(`- ${link.status} \`${link.href}\` (from ${link.from})`);
    }
    lines.push("");
  }

  if (payload.extras?.checks?.length) {
    lines.push("## Product checks", "");
    for (const check of payload.extras.checks) {
      lines.push(`- ${check.ok ? "PASS" : "FAIL"} — ${check.name}: ${check.detail}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function summarize(pages, extras) {
  const p0 = [];
  const p1 = [];
  const p2 = [];
  let guestAuthPages = 0;
  for (const page of pages) {
    const label = `${page.path} [${page.viewport}]`;
    if (!page.status || page.status >= 400) {
      p0.push(`${label} returned HTTP ${page.status}`);
    }
    if (page.failedRequests.some(isExpectedGuestAuthFailure)) guestAuthPages += 1;
    const unexpectedConsole = page.consoleErrors.filter(
      (text) => !/status of 401/.test(text),
    );
    if (unexpectedConsole.length) {
      p1.push(`${label} has ${unexpectedConsole.length} console error(s)`);
    }
    const failedOwn = page.failedRequests.filter(
      (req) => !isThirdParty(req.url) && !isExpectedGuestAuthFailure(req),
    );
    if (failedOwn.length) {
      p1.push(`${label} has ${failedOwn.length} failed first-party request(s)`);
    }
    if (page.brokenImages.length) {
      p1.push(`${label} has ${page.brokenImages.length} broken image(s)`);
    }
    const seriousAxe = page.axeViolations.filter((v) =>
      ["serious", "critical"].includes(v.impact),
    );
    if (seriousAxe.length) {
      p1.push(`${label} has ${seriousAxe.length} serious/critical axe violation(s)`);
    }
    if (page.overflow) p2.push(`${label} horizontal overflow (${page.overflowWidth}px)`);
    if (page.missingAlt.length) p2.push(`${label} ${page.missingAlt.length} image(s) missing alt`);
    const moderateAxe = page.axeViolations.filter((v) => v.impact === "moderate");
    if (moderateAxe.length) p2.push(`${label} ${moderateAxe.length} moderate axe violation(s)`);
  }
  if (guestAuthPages) {
    p2.push(
      `${guestAuthPages} public page(s) called /api/auth/session and received 401 (expected for guests)`,
    );
  }
  for (const check of extras?.checks || []) {
    if (!check.ok) p1.push(`Product check failed: ${check.name} — ${check.detail}`);
  }
  for (const link of extras?.links || []) {
    if (!link.status || link.status >= 400) {
      p0.push(`Broken internal link ${link.href} (HTTP ${link.status || "network error"}) from ${link.from}`);
    }
  }
  return { p0, p1, p2 };
}

function isThirdParty(url) {
  try {
    const host = new URL(url).hostname;
    return !host.endsWith("findra.ph") && host !== "localhost";
  } catch {
    return true;
  }
}

export function isExpectedGuestAuthFailure(req) {
  return req.status === 401 && /\/api\/auth\/session\/?$/.test(req.url);
}

export function finalizePage(result) {
  result.consoleErrors = uniqueByUrl(result.consoleErrors);
  result.consoleWarnings = uniqueByUrl(result.consoleWarnings);
  result.failedRequests = uniqueByUrl(result.failedRequests);
  result.brokenImages = uniqueByUrl(result.brokenImages);
  result.missingAlt = uniqueByUrl(result.missingAlt);
  return result;
}

function sanitize(text) {
  return String(text).replace(/\s+/g, " ").slice(0, 240);
}
