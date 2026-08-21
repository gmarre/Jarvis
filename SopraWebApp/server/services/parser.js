/**
 * Requirements-document parsing: PDF, DOCX, TXT/MD.
 *
 * All three parsers are pure JS, so there is no native dependency and no
 * external binary to install.
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const nlp = require("./nlp");

// Import the library entry point directly: pdf-parse's index.js runs a debug
// harness when it thinks it is the main module, which breaks under some loaders.
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const mammoth = require("mammoth");

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB, matching the UI's stated limit

const SUPPORTED = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

function isSupported(filename) {
  return Object.prototype.hasOwnProperty.call(SUPPORTED, path.extname(filename).toLowerCase());
}

function supportedExtensions() {
  return Object.keys(SUPPORTED);
}

/**
 * Extracts plain text from a document on disk.
 *
 * Returns `{ text, pages, sections, words }`. `pages` is 0 for formats that
 * have no page concept.
 */
async function parse(filePath, originalName = "") {
  const ext = path.extname(originalName || filePath).toLowerCase();
  const stat = await fs.stat(filePath);
  if (stat.size > MAX_BYTES) {
    throw Object.assign(new Error("file_too_large"), { limit: MAX_BYTES, size: stat.size });
  }

  let text = "";
  let pages = 0;

  if (ext === ".pdf") {
    const buf = await fs.readFile(filePath);
    const result = await pdfParse(buf);
    text = result.text || "";
    pages = result.numpages || 0;
  } else if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    text = result.value || "";
  } else if (ext === ".txt" || ext === ".md") {
    text = await fs.readFile(filePath, "utf8");
  } else {
    throw Object.assign(new Error("unsupported_file_type"), { ext });
  }

  text = normalise(text);
  if (!text.trim()) {
    throw Object.assign(new Error("no_text_extracted"), { ext });
  }

  const sections = nlp.splitSections(text);
  return {
    text,
    pages,
    sections: sections.length,
    words: text.split(/\s+/).filter(Boolean).length,
  };
}

/**
 * Collapses the whitespace artefacts PDF extraction leaves behind without
 * destroying paragraph structure (which the section splitter relies on).
 */
function normalise(text) {
  return String(text)
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/-\n(?=[a-zà-ÿ])/g, "") // de-hyphenate words split across lines
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A short excerpt for the "Extracted text preview" panel. */
function excerpt(text, maxChars = 600) {
  const sections = nlp.splitSections(text);
  const body = sections.length ? sections.map((s) => `${s.number} ${s.title}. ${s.body}`).join("\n\n") : text;
  return body.length > maxChars ? body.slice(0, maxChars).trimEnd() + "…" : body;
}

module.exports = { parse, excerpt, isSupported, supportedExtensions, MAX_BYTES, SUPPORTED };
