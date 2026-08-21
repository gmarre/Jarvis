/**
 * End-to-end smoke test.
 *
 * Drives a real Chrome through every screen, captures console errors, page
 * exceptions and failed requests, and writes a screenshot per screen.
 *
 *   node test/e2e.mjs [--base http://127.0.0.1:4199] [--shots <dir>]
 *
 * Exits non-zero if any screen produced an error.
 */

import puppeteer from "puppeteer-core";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const BASE = arg("base", "http://127.0.0.1:4199");
const SHOTS = arg("shots", path.join(process.cwd(), "test", "screenshots"));

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error("No Chrome/Edge found. Set CHROME_PATH.");
  process.exit(2);
}

mkdirSync(SHOTS, { recursive: true });

/** Every screen, in pipeline order. `wait` is a selector proving it rendered. */
const SCREENS = [
  { name: "01-login", path: "/login", wait: "#login-form", anonymous: true },
  { name: "02-train-overview", path: "/train/1", wait: ".sidebar" },
  { name: "03-projects", path: "/projects", wait: ".card--flush" },
  { name: "04-urd-import", path: "/project/1/import", wait: "[data-dropzone]" },
  { name: "05-requirements", path: "/project/1/requirements", wait: ".stepper" },
  { name: "06-epics", path: "/project/1/epics", wait: ".stepper" },
  { name: "16-features", path: "/project/1/features", wait: ".stepper" },
  { name: "07-user-stories", path: "/project/1/stories", wait: "[data-story]" },
  { name: "08-tasks", path: "/project/1/tasks", wait: ".stepper" },
  { name: "09-clusters", path: "/project/1/clusters", wait: ".stepper" },
  { name: "10-dependencies", path: "/project/1/dependencies", wait: ".stepper" },
  { name: "11-prioritization", path: "/project/1/prioritization", wait: "[data-bucket]" },
  { name: "12-export", path: "/project/1/export", wait: "[data-export]" },
  { name: "17-roadmap", path: "/train/1/roadmap", wait: ".board" },
  { name: "18-capacity", path: "/train/1/capacity", wait: "[data-dropzone]" },
  { name: "14-trains", path: "/trains", wait: ".card" },
  { name: "train-shared-requirements", path: "/train/1/requirements", wait: ".card--flush" },
  { name: "train-dependencies", path: "/train/1/dependencies", wait: ".card--flush" },
  { name: "13-administration", path: "/admin", wait: ".card--flush", as: "karim.benali@commerce-group.com" },
];

const results = [];

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1440,900"],
  defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();

let bucket = [];
page.on("console", (msg) => {
  if (msg.type() === "error") bucket.push(`console: ${msg.text()}`);
});
page.on("pageerror", (err) => bucket.push(`exception: ${err.message}`));
page.on("requestfailed", (req) => {
  const failure = req.failure();
  bucket.push(`request failed: ${req.url()} (${failure ? failure.errorText : "?"})`);
});
page.on("response", (res) => {
  if (res.status() >= 400 && new URL(res.url()).pathname.startsWith("/api")) {
    bucket.push(`HTTP ${res.status()} ${new URL(res.url()).pathname}`);
  }
});

async function signIn(email) {
  // Switching user means a clean boot: drop the cookie, then load the page
  // from scratch so the SPA starts with no in-memory session. A hash change
  // alone would keep the previous user in `state` and fire 401s.
  const cookies = await page.cookies();
  if (cookies.length) await page.deleteCookie(...cookies);
  await page.goto("about:blank");
  await page.goto(`${BASE}/#/login`, { waitUntil: "networkidle2" });
  await page.waitForSelector("#login-form", { timeout: 10000 });
  await page.evaluate((value) => {
    const f = document.querySelector("#login-form");
    f.elements.email.value = value;
    f.elements.password.value = "piplanning";
  }, email);
  await Promise.all([
    page.click('#login-form button[type="submit"]'),
    page.waitForFunction(() => !document.querySelector("#login-form"), { timeout: 15000 }),
  ]);
}

let currentUser = null;

for (const screen of SCREENS) {
  bucket = [];
  const wanted = screen.as || "lea.moore@commerce-group.com";

  try {
    if (screen.anonymous) {
      await page.deleteCookie(...(await page.cookies()));
      currentUser = null;
      await page.goto(`${BASE}/#/login`, { waitUntil: "networkidle2" });
    } else {
      if (currentUser !== wanted) {
        await signIn(wanted);
        currentUser = wanted;
        // Sign-in noise belongs to the login flow, not to the screen under test.
        bucket = [];
      }
      await page.evaluate((p) => { location.hash = `#${p}`; }, screen.path);
      // Give the route handler time to fetch and paint.
      await new Promise((r) => setTimeout(r, 900));
    }

    await page.waitForSelector(screen.wait, { timeout: 12000 });
    await new Promise((r) => setTimeout(r, 350));
    await page.screenshot({ path: path.join(SHOTS, `${screen.name}.png`) });

    results.push({ name: screen.name, ok: bucket.length === 0, errors: [...bucket] });
  } catch (err) {
    await page.screenshot({ path: path.join(SHOTS, `${screen.name}-FAIL.png`) }).catch(() => {});
    results.push({ name: screen.name, ok: false, errors: [...bucket, `render: ${err.message}`] });
  }
}

await browser.close();

/* ------------------------------------------------------------------ */

const failed = results.filter((r) => !r.ok);
const width = Math.max(...results.map((r) => r.name.length));

console.log("");
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(width)}  ${r.ok ? "" : r.errors[0]}`);
  if (!r.ok) for (const e of r.errors.slice(1)) console.log(`      ${" ".repeat(width)}  ${e}`);
}
console.log(`\n${results.length - failed.length}/${results.length} screens clean`);
console.log(`screenshots: ${SHOTS}`);

process.exit(failed.length ? 1 : 0);
