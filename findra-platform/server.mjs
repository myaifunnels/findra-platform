import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handlePayMongoRequest } from "./server/paymongo.mjs";
import { handleBrevoRequest } from "./server/brevo.mjs";
import { handleAuthRequest } from "./server/auth.mjs";
import { handleListingsRequest } from "./server/listings.mjs";

const root = fileURLToPath(new URL("./dist/", import.meta.url));
try {
  const envFile = await readFile(
    fileURLToPath(new URL("./.env", import.meta.url)),
    "utf8",
  );
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]])
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
} catch {
  // Production hosts can provide environment variables without a local file.
}
const port = Number(process.env.PORT || 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

createServer(async (request, response) => {
  if (await handleAuthRequest(request, response)) return;
  if (await handleListingsRequest(request, response)) return;
  if (await handleBrevoRequest(request, response)) return;
  if (await handlePayMongoRequest(request, response)) return;
  const pathname = decodeURIComponent(
    new URL(request.url, "http://localhost").pathname,
  );
  const safePath = normalize(pathname)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");
  let filePath = join(root, safePath || "index.html");
  try {
    const file = await readFile(filePath);
    response.setHeader(
      "Content-Type",
      types[extname(filePath)] || "application/octet-stream",
    );
    response.end(file);
  } catch {
    filePath = join(root, "index.html");
    response.setHeader("Content-Type", types[".html"]);
    response.end(await readFile(filePath));
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Findra server running on http://localhost:${port}`);
});
