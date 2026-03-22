// src/js/gradebook.js
// Data + parsing + utilities for Gradebook Explorer
// Lab 06 — CSCI3230U Web App Development

// =============================================================================
// SAMPLE DATA
// still here as a fallback in case CSV loading fails (e.g. no local server).
// lab 06 normally loads grades.csv instead of using this directly.
// =============================================================================

const SAMPLE_DATA = [
  { student: "Ava",   grades: { "Lab 1": 92, "Lab 2": 85, "Lab 3": 88, "Midterm": 79, "Final": 91 } },
  { student: "Noah",  grades: { "Lab 1": 76, "Lab 2": 81, "Lab 3": 74, "Midterm": 69, "Final": 72 } },
  { student: "Mia",   grades: { "Lab 1": 88, "Lab 2": 90, "Lab 3": 84, "Midterm": 93, "Final": 86 } },
  { student: "Liam",  grades: { "Lab 1": 63, "Lab 2": 58, "Lab 3": 71, "Midterm": 66, "Final": 60 } },
  { student: "Zoe",   grades: { "Lab 1": 95, "Lab 2": 92, "Lab 3": 97, "Midterm": 89, "Final": 94 } },
  { student: "Ethan", grades: { "Lab 1": 82, "Lab 2": 77, "Lab 3": 80, "Midterm": 74, "Final": 79 } },
  { student: "Ivy",   grades: { "Lab 1": 70, "Lab 2": 73, "Lab 3": 68, "Midterm": 72, "Final": 75 } },
  { student: "Sam",   grades: { "Lab 1": 55, "Lab 2": 61, "Lab 3": 59, "Midterm": 63, "Final": 58 } },
  { student: "Kai",   grades: { "Lab 1": 84, "Lab 2": 86, "Lab 3": 83, "Midterm": 81, "Final": 85 } },
  { student: "Emma",  grades: { "Lab 1": 91, "Lab 2": 88, "Lab 3": 90, "Midterm": 87, "Final": 92 } },
];

// the shape we work with throughout the app:
//   gb.headers  -> ["Lab 1", "Lab 2", ...]         (assessment names, in order)
//   gb.rows     -> ["Ava", "Noah", ...]             (student names, in order)
//   gb.data     -> { "Ava": { "Lab 1": 92, ... } } (grades, indexed by name)

// =============================================================================
// A) PARSING — convertToIndexed
// =============================================================================

function convertToIndexed(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return { headers: [], rows: [], data: {} };
  }

  const headers = Object.keys(rawRows[0].grades);
  const rows    = rawRows.map(r => r.student);
  const data    = {};

  for (const row of rawRows) {
    data[row.student] = {};
    for (const header of headers) {
      data[row.student][header] = parseGrade(row.grades[header]);
    }
  }

  return { headers, rows, data };
}

// =============================================================================
// A) RETRIEVAL — getRow / getColumn
// =============================================================================

function getRow(gb, rowIndex) {
  if (!isValidRowIndex(gb, rowIndex)) return [];
  const studentName = gb.rows[rowIndex];
  return gb.headers
    .map(h => gb.data[studentName][h])
    .filter(v => v !== null && !isNaN(v));
}

function getColumn(gb, colIndex) {
  if (!isValidColIndex(gb, colIndex)) return [];
  const assessment = gb.headers[colIndex];
  return gb.rows
    .map(s => gb.data[s][assessment])
    .filter(v => v !== null && !isNaN(v));
}

// =============================================================================
// B) SAFETY CHECKS
// =============================================================================

function parseGrade(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return isNaN(n) ? null : n;
}

function isValidRowIndex(gb, rowIndex) {
  return (
    typeof rowIndex === "number" &&
    Number.isInteger(rowIndex) &&
    rowIndex >= 0 &&
    rowIndex < gb.rows.length
  );
}

function isValidColIndex(gb, colIndex) {
  return (
    typeof colIndex === "number" &&
    Number.isInteger(colIndex) &&
    colIndex >= 0 &&
    colIndex < gb.headers.length
  );
}

function isDataCell(rowIndex, colIndex) {
  return rowIndex > 0 && colIndex > 0;
}

// =============================================================================
// NUMERIC SUMMARIES
// =============================================================================

function summarise(values) {
  const valid = values.filter(v => v !== null && !isNaN(v));
  if (valid.length === 0) {
    return { count: 0, mean: null, min: null, max: null, sum: null };
  }
  const sum  = valid.reduce((a, b) => a + b, 0);
  const mean = sum / valid.length;
  return {
    count: valid.length,
    mean:  Math.round(mean * 10) / 10,
    min:   Math.min(...valid),
    max:   Math.max(...valid),
    sum:   Math.round(sum * 10) / 10,
  };
}

// =============================================================================
// C) PROMISE — loadGradesFromFile  (completed in Lab 06)
// fetches grades.csv from the local server, parses it line by line, and
// returns a fully-indexed GradebookData object via a Promise.
// requires: python -m http.server 8000 running in the project root.
// =============================================================================

async function loadGradesFromFile(filePath) {
  // fetch() returns a promise — we await the response, then read it as text
  const response = await fetch(filePath);

  if (!response.ok) {
    // throw so the .catch() in spreadsheet.js can fall back to SAMPLE_DATA
    throw new Error(`Could not load ${filePath} — HTTP ${response.status}`);
  }

  const text = await response.text();
  const rawRows = parseCSV(text);
  return convertToIndexed(rawRows);
}

// =============================================================================
// CSV PARSER
// splits the raw text into rows, uses the first row as column headers,
// and maps each subsequent row into the { student, grades } shape that
// convertToIndexed() expects.
// handles Windows-style \r\n line endings and trims whitespace.
// =============================================================================

function parseCSV(text) {
  // split on newlines, drop blank lines (e.g. trailing newline at end of file)
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length < 2) return []; // need at least a header row + one data row

  // first line: "Student,Lab 1,Lab 2,Lab 3,Midterm,Final"
  const headers = lines[0].split(",").map(h => h.trim());
  // headers[0] is "Student", the rest are assessment names
  const assessments = headers.slice(1);

  const rawRows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    const student = cols[0];
    const grades  = {};

    assessments.forEach((assessment, idx) => {
      // cols[idx + 1] because cols[0] is the student name
      grades[assessment] = cols[idx + 1] !== undefined ? cols[idx + 1] : "";
    });

    rawRows.push({ student, grades });
  }

  return rawRows;
}

// =============================================================================
// UNIT TESTS (unchanged from lab 04 — still all passing)
// =============================================================================

(function runTests() {
  console.group("=== gradebook.js — unit tests ===");

  const gb = convertToIndexed(SAMPLE_DATA);

  console.assert(gb.rows.length === 10,           "FAIL: expected 10 students");
  console.assert(gb.headers.length === 5,         "FAIL: expected 5 assessments");
  console.assert(gb.data["Ava"]["Lab 1"] === 92,  "FAIL: Ava's Lab 1 should be 92");
  console.log("✓ convertToIndexed structure OK");

  const avaRow = getRow(gb, 0);
  console.assert(avaRow.length === 5,  "FAIL: Ava should have 5 grades");
  console.assert(avaRow[0] === 92,     "FAIL: Ava's first grade should be 92");
  console.log("✓ getRow OK:", avaRow);

  const lab1Col = getColumn(gb, 0);
  console.assert(lab1Col.length === 10, "FAIL: Lab 1 should have 10 entries");
  console.assert(lab1Col[0] === 92,     "FAIL: first Lab 1 grade should be 92");
  console.log("✓ getColumn OK:", lab1Col);

  console.assert(getRow(gb, -1).length === 0,    "FAIL: negative row index");
  console.assert(getRow(gb, 99).length === 0,    "FAIL: row index out of range");
  console.assert(getColumn(gb, -1).length === 0, "FAIL: negative col index");
  console.assert(getColumn(gb, 99).length === 0, "FAIL: col index out of range");
  console.log("✓ boundary checks OK");

  console.assert(parseGrade("") === null,    "FAIL: empty string should be null");
  console.assert(parseGrade(null) === null,  "FAIL: null should stay null");
  console.assert(parseGrade("abc") === null, "FAIL: non-numeric string should be null");
  console.assert(parseGrade("88") === 88,    "FAIL: numeric string '88' should become 88");
  console.assert(parseGrade(72) === 72,      "FAIL: number should pass through unchanged");
  console.log("✓ parseGrade safety checks OK");

  console.assert(isDataCell(1, 1) === true,  "FAIL: (1,1) is a real data cell");
  console.assert(isDataCell(0, 1) === false, "FAIL: row 0 is the header row");
  console.assert(isDataCell(1, 0) === false, "FAIL: col 0 is the student-name column");
  console.log("✓ isDataCell checks OK");

  const s = summarise([80, 90, 70, null]);
  console.assert(s.count === 3,  "FAIL: count should be 3 (null excluded)");
  console.assert(s.mean === 80,  "FAIL: mean of 70/80/90 should be 80");
  console.assert(s.min === 70,   "FAIL: min should be 70");
  console.assert(s.max === 90,   "FAIL: max should be 90");
  console.log("✓ summarise OK:", s);

  const empty = summarise([]);
  console.assert(empty.mean === null, "FAIL: mean of empty array should be null");
  console.log("✓ summarise empty OK:", empty);

  // --- chart.js tests ---
  console.assert(toLetterGrade(95) === "A",  "FAIL: 95 should be A");
  console.assert(toLetterGrade(80) === "A",  "FAIL: 80 should be A");
  console.assert(toLetterGrade(79) === "B",  "FAIL: 79 should be B");
  console.assert(toLetterGrade(70) === "B",  "FAIL: 70 should be B");
  console.assert(toLetterGrade(69) === "C",  "FAIL: 69 should be C");
  console.assert(toLetterGrade(60) === "C",  "FAIL: 60 should be C");
  console.assert(toLetterGrade(59) === "D",  "FAIL: 59 should be D");
  console.assert(toLetterGrade(50) === "D",  "FAIL: 50 should be D");
  console.assert(toLetterGrade(49) === "F",  "FAIL: 49 should be F");
  console.log("✓ toLetterGrade OK");

  const freq = computeFrequencies([85, 75, 65, 55, 45]);
  console.assert(freq.A === 0.2, "FAIL: freq.A should be 0.2");
  console.assert(freq.B === 0.2, "FAIL: freq.B should be 0.2");
  console.assert(freq.C === 0.2, "FAIL: freq.C should be 0.2");
  console.assert(freq.D === 0.2, "FAIL: freq.D should be 0.2");
  console.assert(freq.F === 0.2, "FAIL: freq.F should be 0.2");
  console.log("✓ computeFrequencies OK:", freq);

  console.groupEnd();
})();
