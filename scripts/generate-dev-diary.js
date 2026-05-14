#!/usr/bin/env node
"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const DEFAULT_SCREENSHOT_LIMIT = 4;

function git(args, fallback = "unknown") {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function splitScreenshotEnv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function discoverScreenshots(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(directory, entry.name))
    .filter((filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
    .map((filePath) => ({
      filePath,
      modifiedAt: fs.statSync(filePath).mtimeMs,
    }))
    .sort((a, b) => b.modifiedAt - a.modifiedAt)
    .map((entry) => entry.filePath);
}

function resolveScreenshots() {
  const explicitScreenshots = splitScreenshotEnv(process.env.SCREENSHOTS);
  const screenshotPaths =
    explicitScreenshots.length > 0
      ? explicitScreenshots
      : discoverScreenshots(path.resolve(process.cwd(), "screenshots"));

  const resolved = [];
  for (const screenshotPath of screenshotPaths) {
    const absolutePath = path.resolve(process.cwd(), screenshotPath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      console.warn(`Skipping missing screenshot: ${screenshotPath}`);
      continue;
    }

    if (!IMAGE_EXTENSIONS.has(path.extname(absolutePath).toLowerCase())) {
      console.warn(`Skipping unsupported screenshot type: ${screenshotPath}`);
      continue;
    }

    resolved.push(absolutePath);
  }

  return resolved;
}

function screenshotHeight(count) {
  if (count <= 1) {
    return "118mm";
  }
  if (count <= 2) {
    return "82mm";
  }
  if (count <= 4) {
    return "55mm";
  }
  return "36mm";
}

function renderScreenshotGrid(screenshots, totalCount) {
  if (screenshots.length === 0) {
    return `
      <section class="screenshots empty">
        <p>No screenshots found for this diary.</p>
      </section>
    `;
  }

  const limitNote =
    totalCount > screenshots.length
      ? `<p class="limit-note">Showing ${screenshots.length} of ${totalCount} screenshots.</p>`
      : "";

  const images = screenshots
    .map((screenshotPath) => {
      const fileName = escapeHtml(path.basename(screenshotPath));
      const href = pathToFileURL(screenshotPath).href;
      return `
        <figure class="shot">
          <img src="${href}" alt="${fileName}" />
          <figcaption>${fileName}</figcaption>
        </figure>
      `;
    })
    .join("");

  return `
    <section class="screenshots">
      ${limitNote}
      <div class="shot-grid" style="--shot-height: ${screenshotHeight(screenshots.length)};">
        ${images}
      </div>
    </section>
  `;
}

function buildHtml({ commit, screenshots, totalScreenshots, takeaway, generatedAt }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Dev Diary</title>
    <style>
      @page {
        margin: 0;
        size: A4 portrait;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #f5f7f8;
        color: #102a43;
        font-family: Arial, Helvetica, sans-serif;
      }

      .page {
        width: 210mm;
        height: 297mm;
        padding: 18mm;
        background: #ffffff;
        display: flex;
        flex-direction: column;
      }

      .kicker {
        color: #577590;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        margin: 0 0 5mm;
        text-transform: uppercase;
      }

      h1 {
        color: #0b3b5a;
        font-size: 28px;
        line-height: 1.15;
        margin: 0 0 7mm;
      }

      .meta-grid {
        border-bottom: 1px solid #d8e2ea;
        border-top: 1px solid #d8e2ea;
        display: grid;
        gap: 0;
        grid-template-columns: 27mm 1fr;
        margin-bottom: 7mm;
      }

      .meta-grid dt,
      .meta-grid dd {
        border-bottom: 1px solid #edf2f7;
        font-size: 11px;
        margin: 0;
        min-height: 8mm;
        padding: 2.6mm 0;
      }

      .meta-grid dt {
        color: #577590;
        font-weight: 700;
        text-transform: uppercase;
      }

      .meta-grid dd {
        color: #1f2937;
      }

      .meta-grid dt:last-of-type,
      .meta-grid dd:last-of-type {
        border-bottom: 0;
      }

      .takeaway {
        background: #f7faf9;
        border-left: 4px solid #2f7d6d;
        margin: 0 0 7mm;
        padding: 4mm 5mm;
      }

      .takeaway h2 {
        color: #164e45;
        font-size: 12px;
        letter-spacing: 0.04em;
        margin: 0 0 2mm;
        text-transform: uppercase;
      }

      .takeaway p {
        color: #263238;
        font-size: 13px;
        line-height: 1.45;
        margin: 0;
      }

      .screenshots {
        flex: 1;
        min-height: 0;
      }

      .screenshots.empty {
        align-items: center;
        border: 1px dashed #b8c5d1;
        color: #6b7280;
        display: flex;
        font-size: 13px;
        justify-content: center;
        min-height: 90mm;
      }

      .limit-note {
        color: #6b7280;
        font-size: 10px;
        margin: 0 0 2mm;
      }

      .shot-grid {
        display: grid;
        gap: 4mm;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .shot {
        border: 1px solid #d8e2ea;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        height: var(--shot-height);
        margin: 0;
        min-width: 0;
        overflow: hidden;
      }

      .shot img {
        background: #f8fafc;
        flex: 1;
        height: 100%;
        min-height: 0;
        object-fit: contain;
        width: 100%;
      }

      .shot figcaption {
        border-top: 1px solid #e5e7eb;
        color: #536471;
        font-size: 8px;
        line-height: 1.2;
        overflow: hidden;
        padding: 1.3mm 2mm;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      footer {
        color: #7a8793;
        font-size: 9px;
        margin-top: 6mm;
      }
    </style>
  </head>
  <body>
    <main class="page">
      <p class="kicker">Dev Diary</p>
      <h1>Latest Commit Report</h1>

      <dl class="meta-grid">
        <dt>SHA</dt>
        <dd>${escapeHtml(commit.sha)}</dd>
        <dt>Message</dt>
        <dd>${escapeHtml(commit.message)}</dd>
        <dt>Author</dt>
        <dd>${escapeHtml(commit.author)}</dd>
        <dt>Date</dt>
        <dd>${escapeHtml(commit.date)}</dd>
      </dl>

      <section class="takeaway">
        <h2>One-line takeaway</h2>
        <p>${escapeHtml(takeaway)}</p>
      </section>

      ${renderScreenshotGrid(screenshots, totalScreenshots)}

      <footer>Generated at ${escapeHtml(generatedAt)} by scripts/generate-dev-diary.js</footer>
    </main>
  </body>
</html>`;
}

async function loadPuppeteer() {
  try {
    return require("puppeteer");
  } catch (error) {
    console.error("Unable to load puppeteer.");
    console.error("Install it locally with `npm install --no-save puppeteer`, or use the GitHub Actions workflow.");
    throw error;
  }
}

async function main() {
  const outputPath = path.resolve(process.cwd(), process.argv[2] || "docs/dev-diary.pdf");
  const screenshotLimit = parsePositiveInteger(process.env.SCREENSHOT_LIMIT, DEFAULT_SCREENSHOT_LIMIT);
  const allScreenshots = resolveScreenshots();
  const selectedScreenshots = allScreenshots.slice(0, screenshotLimit);
  const takeaway =
    process.env.DEV_TAKEAWAY ||
    "Set DEV_TAKEAWAY to add a concise progress note for this build.";

  const commit = {
    sha: git(["rev-parse", "--short", "HEAD"]),
    message: git(["show", "-s", "--format=%s", "HEAD"]),
    author: git(["show", "-s", "--format=%an <%ae>", "HEAD"]),
    date: git(["show", "-s", "--format=%ad", "--date=iso-strict", "HEAD"]),
  };

  const generatedAt = new Date().toISOString();
  const html = buildHtml({
    commit,
    screenshots: selectedScreenshots,
    totalScreenshots: allScreenshots.length,
    takeaway,
    generatedAt,
  });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "elysia-dev-diary-"));
  const htmlPath = path.join(tempDir, "dev-diary.html");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(htmlPath, html, "utf8");

  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
