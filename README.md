# Gradebook Explorer

A simple gradebook web app built for CSCI3230U (Web App Development) over three labs.

## What it does

Loads a CSV of student grades and displays them in an interactive table. You can:

- Click a **column header** (e.g. Midterm) to select that assessment for all students
- Click a **row header** (e.g. Liam) to select that student's grades
- See a live **summary** (count, mean, min, max) for whatever you've selected
- See a **bar chart** of the grade distribution (A–F) for the selection
- Click any **grade cell** to edit it — press Enter to save, Escape to cancel
- The chart updates automatically after edits

## How to run it

### Option 1 — GitHub Pages (easiest)
Just visit the live site: `[https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/](https://jollysoni.github.io/Gradebook-Explorer-Lab-04-06/src/pages/spreadsheet.html)`

### Option 2 — Local server
```bash
cd L04-06-3
python -m http.server 8000
```
Then open: `http://localhost:8000/src/pages/spreadsheet.html`

> You need a server (not just opening the HTML file directly) because the app fetches `grades.csv` dynamically.

## Tech used

- HTML/CSS — layout and styling
- JavaScript — data parsing, summaries, core logic
- jQuery — DOM manipulation and interactivity
- D3.js — bar chart

## File structure
```
src/
├── pages/spreadsheet.html   # main page
├── css/spreadsheet.css      # all styles
├── js/
│   ├── gradebook.js         # data parsing, utilities, CSV loader
│   ├── spreadsheet.js       # table builder, selection, cell editing
│   └── chart.js             # D3 bar chart
└── data/grades.csv          # student grade data
```
