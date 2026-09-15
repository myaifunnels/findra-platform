import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const html = join(root, "FINDRA-client-revision-design-spec.html");
const pdf = join(root, "FINDRA-client-revision-design-spec.pdf");
const artifactDir = "/opt/cursor/artifacts";
const artifactPdf = join(artifactDir, "FINDRA-client-revision-design-spec.pdf");

mkdirSync(artifactDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(html).href, { waitUntil: "networkidle" });
await page.pdf({
  path: pdf,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: `<div></div>`,
  footerTemplate: `
    <div style="font-size:8px;width:100%;padding:0 18mm;color:#4d5b50;font-family:Helvetica,Arial,sans-serif;display:flex;justify-content:space-between;">
      <span>Findra · Client revision design spec</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`,
  margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" },
});
await page.pdf({
  path: artifactPdf,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: `<div></div>`,
  footerTemplate: `
    <div style="font-size:8px;width:100%;padding:0 18mm;color:#4d5b50;font-family:Helvetica,Arial,sans-serif;display:flex;justify-content:space-between;">
      <span>Findra · Client revision design spec</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`,
  margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" },
});
await browser.close();
console.log(`Wrote ${pdf}`);
console.log(`Wrote ${artifactPdf}`);
