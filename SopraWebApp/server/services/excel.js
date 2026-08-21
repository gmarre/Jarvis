/**
 * Excel capacity import.
 *
 * Reads a workbook where rows are teams/projects and columns are sprints, and
 * maps it onto `capacity` rows. Header detection is deliberately forgiving —
 * real capacity workbooks are hand-maintained and rarely match a fixed template.
 */

const ExcelJS = require("exceljs");

const SPRINT_HEADER = /^\s*(?:sprint|itération|iteration|it)\s*[-_ ]?(\d+)\s*$/i;
const PROJECT_HEADER = /^\s*(project|projet|team|équipe|equipe|squad|feature team)\s*$/i;

/**
 * Parses a capacity workbook.
 *
 * Returns `{ sprints, rows, warnings }` where `sprints` is the ordered list of
 * sprint labels found in the header row and each row is
 * `{ project, values: { [sprintLabel]: number } }`.
 */
async function parseCapacity(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("empty_workbook");

  const warnings = [];

  // Find the header row: the first row containing at least two sprint columns.
  let headerRowNumber = 0;
  let sprintCols = [];
  let projectCol = 1;

  for (let r = 1; r <= Math.min(sheet.rowCount, 25); r++) {
    const row = sheet.getRow(r);
    const found = [];
    let projCandidate = 0;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const value = cellText(cell);
      const m = value.match(SPRINT_HEADER);
      if (m) found.push({ col, label: `Sprint ${parseInt(m[1], 10)}`, index: parseInt(m[1], 10) });
      else if (PROJECT_HEADER.test(value)) projCandidate = col;
    });
    if (found.length >= 2) {
      headerRowNumber = r;
      sprintCols = found.sort((a, b) => a.index - b.index);
      projectCol = projCandidate || 1;
      break;
    }
  }

  if (!headerRowNumber) {
    throw Object.assign(new Error("no_sprint_columns"), {
      hint: 'Expected a header row with columns named "Sprint 1", "Sprint 2", …',
    });
  }

  const rows = [];
  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const project = cellText(row.getCell(projectCol)).trim();
    if (!project) continue;
    if (/^\s*(total|totaux|sum)\s*$/i.test(project)) continue; // skip footer totals

    const values = {};
    let any = false;
    for (const sc of sprintCols) {
      const raw = row.getCell(sc.col).value;
      const num = toNumber(raw);
      if (num === null) {
        if (raw != null && String(raw).trim() !== "") {
          warnings.push(`Row ${r} · ${sc.label}: "${cellText(row.getCell(sc.col))}" is not a number — treated as 0.`);
        }
        values[sc.label] = 0;
      } else {
        values[sc.label] = num;
        any = true;
      }
    }
    if (any) rows.push({ project, values });
  }

  if (!rows.length) {
    throw Object.assign(new Error("no_capacity_rows"), {
      hint: "Found sprint columns but no rows with numeric capacity.",
    });
  }

  return { sprints: sprintCols.map((s) => s.label), rows, warnings, sheetName: sheet.name };
}

function cellText(cell) {
  if (!cell) return "";
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "object") {
    if (v.richText) return v.richText.map((t) => t.text).join("");
    if (v.text) return String(v.text);
    if (v.result != null) return String(v.result);
    return "";
  }
  return String(v);
}

function toNumber(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && v.result != null) return toNumber(v.result);
  const n = Number(String(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Builds a workbook the app itself can re-import — used as a template download. */
async function buildTemplate(projects, sprints) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PI Planning Assistant";
  const sheet = wb.addWorksheet("Capacity");

  sheet.addRow(["Project", ...sprints.map((s) => s.name)]);
  sheet.getRow(1).font = { bold: true };
  for (const p of projects) {
    sheet.addRow([p.name, ...sprints.map(() => 0)]);
  }
  sheet.columns.forEach((c, i) => {
    c.width = i === 0 ? 28 : 12;
  });
  return wb.xlsx.writeBuffer();
}

module.exports = { parseCapacity, buildTemplate };
