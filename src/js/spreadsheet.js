// src/js/spreadsheet.js
// DOM generation + interactivity + summary updates
// Lab 06 — CSCI3230U Web App Development

// =============================================================================
// STATE
// =============================================================================

let _gradebook = null;

const _selection = {
  type:  null,   // "row" | "col" | null
  index: null,
  label: "",
};

// =============================================================================
// BOOTSTRAP
// Lab 06: load grades.csv via fetch() instead of using SAMPLE_DATA directly.
// fetch() is promise-based — we wait for the file to load, parse it, then
// build the table. the server must be running (python -m http.server 8000)
// because browsers block fetch() on file:// URLs.
// =============================================================================

$(document).ready(function () {
  buildLayout();

  // try loading the real CSV first; fall back to SAMPLE_DATA if it fails
  // (so the page still works when opened without a local server during dev)
  loadGradesFromFile("../data/grades.csv")
    .then(gb => {
      _gradebook = gb;
      buildTable(_gradebook);
      renderSummary(null, null);
    })
    .catch(err => {
      console.warn("[Lab 06] CSV fetch failed, falling back to SAMPLE_DATA:", err);
      _gradebook = convertToIndexed(SAMPLE_DATA);
      buildTable(_gradebook);
      renderSummary(null, null);
    });
});

// =============================================================================
// LAYOUT
// builds all required page sections. the chart card is added here now
// (it was just a placeholder comment in lab 04/05).
// =============================================================================

function buildLayout() {
  const $body     = $("body");
  const $pageBody = $("<div>").addClass("page-body");

  // --- selection summary card ---
  const $summaryCard = $("<div>").addClass("card");
  $summaryCard.append($("<div>").addClass("card-title").text("Selection Summary"));

  const $grid = $("<div>").addClass("summary-grid");
  const statDefs = [
    { id: "stat-selected", label: "Selected", init: "None: —" },
    { id: "stat-count",    label: "Count",    init: "0"       },
    { id: "stat-mean",     label: "Mean",     init: "—"       },
    { id: "stat-min",      label: "Min",      init: "—"       },
    { id: "stat-max",      label: "Max",      init: "—"       },
  ];
  statDefs.forEach(def => {
    const $cell = $("<div>").addClass("summary-cell");
    $cell.append($("<div>").addClass("summary-cell-label").text(def.label));
    $cell.append($("<div>").addClass("summary-cell-value").attr("id", def.id).text(def.init));
    $grid.append($cell);
  });
  $summaryCard.append($grid);

  // instructions
  const $instrBox = $("<div>").addClass("instructions-box");
  $instrBox.append($("<h3>").text("Instructions"));
  const $ul = $("<ul>");
  [
    "Click a <strong>column header</strong> to select an assessment.",
    "Click a <strong>row header</strong> to select a student.",
    "Click a <strong>grade cell</strong> to edit; press <strong>ENTER</strong> to save.",
  ].forEach(html => $ul.append($("<li>").html(html)));
  $instrBox.append($ul);
  $summaryCard.append($instrBox);
  $pageBody.append($summaryCard);

  // --- gradebook table card ---
  const $tableCard = $("<div>").addClass("card");
  $tableCard.append($("<div>").addClass("card-title").text("Gradebook"));
  const $scroll = $("<div>").addClass("table-scroll");
  $scroll.append($("<table>").attr("id", "gradebook-table"));
  $tableCard.append($scroll);
  $pageBody.append($tableCard);

  // --- chart card (lab 06) ---
  // the SVG lives inside this card; D3 writes into it via renderChart()
  const $chartCard = $("<div>").addClass("card");
  $chartCard.append($("<div>").addClass("card-title").text("Grade Distribution (A-F)"));
  // width: 100% via CSS so D3 can read clientWidth for scaling
  $chartCard.append($("<div>").attr("id", "chart-container").addClass("chart-container-inner"));
  $pageBody.append($chartCard);

  $body.append($pageBody);
}

// =============================================================================
// TABLE BUILDER
// same as lab 05 — jQuery builds the table from the gradebook data.
// called after CSV load resolves (or after fallback to SAMPLE_DATA).
// =============================================================================

function buildTable(gb) {
  const $table = $("#gradebook-table");
  $table.empty();

  // --- header row ---
  const $thead = $("<thead>");
  const $headerRow = $("<tr>");
  $headerRow.append($("<th>").addClass("corner-cell").text("Student"));

  gb.headers.forEach((assessment, colIdx) => {
    const $th = $("<th>").text(assessment);
    $th.on("click", function () { onColumnHeaderClick(colIdx, assessment); });
    $headerRow.append($th);
  });
  $thead.append($headerRow);
  $table.append($thead);

  // --- data rows ---
  const $tbody = $("<tbody>");
  gb.rows.forEach((student, rowIdx) => {
    const $tr = $("<tr>").attr("data-r", rowIdx);

    const $rowHeader = $("<th>").text(student).attr("scope", "row");
    $rowHeader.on("click", function () { onRowHeaderClick(rowIdx, student); });
    $tr.append($rowHeader);

    gb.headers.forEach((assessment, colIdx) => {
      const grade = gb.data[student][assessment];
      const $td = $("<td>")
        .text(grade !== null ? grade : "—")
        .attr("data-c", colIdx)
        .attr("data-r", rowIdx)
        .attr("data-student", student)
        .attr("data-assessment", assessment);

      $td.on("click", function () { openCellEditor($(this)); });
      $tr.append($td);
    });

    $tbody.append($tr);
  });

  $table.append($tbody);
}

// =============================================================================
// REQUIRED JQUERY SELECTION FUNCTIONS (lab 05, carried forward)
// =============================================================================

function deselectAll() {
  $("#gradebook-table tbody td").removeClass("selected");
  _selection.type  = null;
  _selection.index = null;
  _selection.label = "";
  renderSummary(null, null);
  clearChart(); // remove chart when nothing is selected
}

function selectRow(rowIndex) {
  $(`#gradebook-table tbody tr[data-r="${rowIndex}"] td`).addClass("selected");
}

function selectColumn(colIndex) {
  $(`#gradebook-table tbody td[data-c="${colIndex}"]`).addClass("selected");
}

// =============================================================================
// SELECTION CLICK HANDLERS
// lab 06 addition: after updating the summary, also render the D3 chart
// =============================================================================

function onColumnHeaderClick(colIdx, label) {
  if (_selection.type === "col" && _selection.index === colIdx) {
    deselectAll();
    return;
  }

  deselectAll();
  _selection.type  = "col";
  _selection.index = colIdx;
  _selection.label = label;

  selectColumn(colIdx);

  const values = getColumn(_gradebook, colIdx);
  renderSummary(`Column: ${label}`, values);
  renderChart(values);  // draw the grade distribution chart for this column
}

function onRowHeaderClick(rowIdx, label) {
  if (_selection.type === "row" && _selection.index === rowIdx) {
    deselectAll();
    return;
  }

  deselectAll();
  _selection.type  = "row";
  _selection.index = rowIdx;
  _selection.label = label;

  selectRow(rowIdx);

  const values = getRow(_gradebook, rowIdx);
  renderSummary(`Row: ${label}`, values);
  renderChart(values);  // draw the grade distribution chart for this row
}

// =============================================================================
// CELL EDITING (lab 05, carried forward)
// lab 06 addition: after committing an edit, re-render the chart too so it
// stays in sync with the updated grades
// =============================================================================

function openCellEditor($td) {
  if ($td.find("input").length > 0) return;

  const currentText = $td.text().trim();
  const student     = $td.attr("data-student");
  const assessment  = $td.attr("data-assessment");

  const $input = $("<input>")
    .attr("type", "text")
    .addClass("cell-input")
    .val(currentText === "—" ? "" : currentText);

  $td.empty().append($input);
  $input.trigger("focus").trigger("select");

  $input.on("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit($td, $input.val(), student, assessment);
    }
    if (e.key === "Escape") {
      $td.text(currentText);
    }
  });

  $input.on("blur", function () {
    if ($td.find("input").length > 0) {
      commitEdit($td, $input.val(), student, assessment);
    }
  });
}

function commitEdit($td, rawValue, student, assessment) {
  const parsed = parseGrade(rawValue);

  // update the in-memory data so getRow/getColumn reflect the change
  _gradebook.data[student][assessment] = parsed;
  $td.text(parsed !== null ? parsed : "—");

  // refresh summary AND chart if the edited cell is in the current selection
  if (_selection.type === "row" && parseInt($td.attr("data-r")) === _selection.index) {
    const values = getRow(_gradebook, _selection.index);
    renderSummary(`Row: ${_selection.label}`, values);
    renderChart(values);  // chart must update after edits per spec
  } else if (_selection.type === "col" && parseInt($td.attr("data-c")) === _selection.index) {
    const values = getColumn(_gradebook, _selection.index);
    renderSummary(`Column: ${_selection.label}`, values);
    renderChart(values);  // same for column edits
  }
}

// =============================================================================
// SUMMARY PANEL
// =============================================================================

function renderSummary(selectionLabel, values) {
  const s = values && values.length > 0 ? summarise(values) : null;
  $("#stat-selected").text(selectionLabel || "None: —");
  $("#stat-count").text(s  ? String(s.count)   : "0");
  $("#stat-mean").text(s   ? s.mean.toFixed(2) : "—");
  $("#stat-min").text(s    ? s.min.toFixed(2)  : "—");
  $("#stat-max").text(s    ? s.max.toFixed(2)  : "—");
}

// =============================================================================
// DOM UTILITY
// =============================================================================

function el(tag, props = {}) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  return node;
}
