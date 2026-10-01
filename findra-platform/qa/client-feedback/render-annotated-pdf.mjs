import { spawn } from "node:child_process";
import { mkdtemp, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const html = path.join(root, "GOOGLE-DOC-ANNOTATED.html");
const pdf = path.join(root, "GOOGLE-DOC-ANNOTATED.pdf");
const chrome = process.env.CHROME_PATH || "google-chrome";
const profile = await mkdtemp(path.join(os.tmpdir(), "findra-pdf-"));

await mkdir(root, { recursive: true });

const child = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-pdf-header-footer",
    "--virtual-time-budget=5000",
    `--user-data-dir=${profile}`,
    `--print-to-pdf=${pdf}`,
    `file://${html}`,
  ],
  { stdio: "inherit" },
);

const timer = setTimeout(() => child.kill("SIGTERM"), 20000);
child.on("exit", (code) => {
  clearTimeout(timer);
  if (code && code !== 0) {
    console.error(`Chrome exited with code ${code}`);
    process.exit(code);
  }
  console.log(`Wrote ${pdf}`);
});
