import { test, expect } from "@playwright/test";

const routes = [
  ["/", /findra/i],
  ["/about", /about/i],
  ["/packages", /package|pricing|early bird|basic/i],
  ["/contact", /contact/i],
  ["/faq", /faq|frequently/i],
  ["/legal", /legal|privacy|terms/i],
  ["/listings", /business/i],
  ["/login", /log ?in|register|sign/i],
];

for (const [path, heading] of routes) {
  test(`loads ${path}`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response, `no response for ${path}`).toBeTruthy();
    expect(response.status(), `${path} should not be 5xx`).toBeLessThan(500);
    await expect(page.locator("body")).toContainText(heading);
  });
}

test("header navigation reaches core public pages", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop nav only");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  for (const label of ["Home", "About", "Packages", "Contact Us"]) {
    await page.locator("header nav").getByText(label, { exact: true }).first().click();
    await expect(page.locator("body")).toBeVisible();
  }
});
