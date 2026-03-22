// src/js/chart.js
// D3 bar chart for Gradebook Explorer
// Lab 06 — CSCI3230U Web App Development

// =============================================================================
// LETTER GRADE CONVERSION
// =============================================================================

function toLetterGrade(numeric) {
  if (numeric >= 80) return "A";
  if (numeric >= 70) return "B";
  if (numeric >= 60) return "C";
  if (numeric >= 50) return "D";
  return "F";
}

// =============================================================================
// FREQUENCY COMPUTATION
// returns { A, B, C, D, F } as proportions 0–1
// =============================================================================

function computeFrequencies(numericGrades) {
  const counts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const valid  = numericGrades.filter(v => v !== null && !isNaN(v));

  if (valid.length === 0) return { A: 0, B: 0, C: 0, D: 0, F: 0 };

  valid.forEach(grade => { counts[toLetterGrade(grade)]++; });

  const total = valid.length;
  return {
    A: counts.A / total,
    B: counts.B / total,
    C: counts.C / total,
    D: counts.D / total,
    F: counts.F / total,
  };
}

// =============================================================================
// D3 BAR CHART
// =============================================================================

function renderChart(numericGrades) {
  // clear any previous chart
  const container = document.getElementById("chart-container");
  container.innerHTML = "";

  const frequencies = computeFrequencies(numericGrades);
  const letters = ["A", "B", "C", "D", "F"];
  const data = letters.map(letter => ({ letter, freq: frequencies[letter] }));

  // use the container's actual rendered width, fall back to 600
  const totalW  = container.clientWidth || 600;
  const margin  = { top: 20, right: 30, bottom: 50, left: 60 };
  const width   = totalW - margin.left - margin.right;
  const height  = 280 - margin.top - margin.bottom;

  // create the SVG element manually so we control every attribute
  const svg = d3.select("#chart-container")
    .append("svg")
    .attr("width", totalW)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // --- x scale ---
  const x = d3.scaleBand()
    .domain(letters)
    .range([0, width])
    .padding(0.35);

  // --- y scale (0 to 1, displayed as 0% to 100%) ---
  const y = d3.scaleLinear()
    .domain([0, 1])
    .range([height, 0]);

  // --- x axis ---
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSizeOuter(0));

  // --- y axis with % labels ---
  svg.append("g")
    .call(
      d3.axisLeft(y)
        .ticks(5)
        .tickFormat(d => `${Math.round(d * 100)}%`)
    );

  // --- x axis label ---
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "13px")
    .style("fill", "#444")
    .text("Letter Grade");

  // --- y axis label ---
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(height / 2))
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .style("font-size", "13px")
    .style("fill", "#444")
    .text("Frequency");

  // --- bars ---
  svg.selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x",      d => x(d.letter))
    .attr("y",      d => y(d.freq))
    .attr("width",  x.bandwidth())
    .attr("height", d => height - y(d.freq))
    .attr("fill", "#111");
}

// =============================================================================
// CLEAR CHART
// =============================================================================

function clearChart() {
  const container = document.getElementById("chart-container");
  if (container) container.innerHTML = "";
}
