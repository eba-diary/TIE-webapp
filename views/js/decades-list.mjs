/**
 * @fileoverview decades-list.js shows a list of decades and the publications detailing travels starting in those decades
 */
import checkStatus from "./check-status.mjs";

init();

/**
 * Initialize the page by populating search options and activating the form
 */
function init() {
  fetch("/api/decades")
    .then(checkStatus)
    .then(res => res.json())
    .then(decades => showDecades(decades));
}

/**
 * Show a list of decades and their publications. Each decade has its own table of publications.
 * @param {Object[]} decades decades to show
 */
function showDecades(decades) {
  for (let decade of decades) {
    let decadeDisplay = document.getElementById("decade").content.cloneNode(true);

    let year = decade.decade;
    year = (decade === null) ? "Unknown decade" : year + "s";
    decadeDisplay.querySelector(".decade-name").textContent = year;

    addPublications(decade.publications, decadeDisplay.querySelector(".publications"));
  }
}

/**
 * Shows a list of publications in a table
 * @param {Object[]}          publications  list of publications to add to the table
 * @param {HTMLTableElement}  table         table to add publications to
 */
function addPublications(publications, table) {
  let tableBody = table.querySelector("tbody");
  for (let publication of publications) {
    let row = document.getElementById("publication").content.cloneNode(true);

    let title = row.querySelector(".title");
    title.href = "/publication?id=" + publication.id;
    title.textContent = publication.title;

    let authorList = row.querySelector(".author");
    for (let traveler of publication.travelers) {
      let author = document.createElement("li");
      author.textContent = traveler.name +
        (traveler.type === "Author" ? "" : ` (${traveler.type})`);
      authorList.appendChild(author);
    }

    row.querySelector(".travel-dates").textContent = publication.travel_dates;

    tableBody.appendChild(row);
  }
}