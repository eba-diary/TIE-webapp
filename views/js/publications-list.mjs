/**
 * @fileoverview publications-list.mjs gets and shows a list of publications in the Travelogues DB
 */
"use strict";
window.addEventListener("load", init);

/**
 * Initializes the page and fetches the first set of publications
 */
function init() {
  fetch("/api/publications")
    .then(checkStatus)
    .then(res => res.json())
    .then(json => showPublications(json.publications))
}

/**
 * Shows the list of publications in the publications list
 * @param {Object[]} publications list of publications
 */
function showPublications(publications) {
  let list = document.getElementById("publications");
  for (let publication of publications) {
    let entry = document.createElement("li");
    entry.textContent = publication.title;
    list.appendChild(entry)
  }
}

/**
 * Checks if a fetch response is OK, throws otherwise
 * @param {Response} response fetch response
 * @returns {Response} fetch response
 */
function checkStatus(response) {
  if (response.ok) return response;
  throw Error("Error in request: " + response.statusText)
}