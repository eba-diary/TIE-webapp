/**
 * @fileoverview publications-list.mjs gets and shows a list of publications in the Travelogues DB
 */
import checkStatus from "./check-status.mjs";
 
"use strict";
window.addEventListener("load", init);

/**
 * Initializes the page and fetches the first set of publications
 */
function init() {
  fetchPublications();
}

/**
 * Fetches publications from the publications API
 * @param {Number} offset pagination offset
 */
function fetchPublications() {
  fetch("/api/publications")
    .then(checkStatus)
    .then(res => res.json())
    .then(json => showPublications(json));
}

/**
 * Shows the list of publications in the publications list
 * @param {Object[]} publications list of publications
 */
function showPublications(publications) {
  let list = document.getElementById("publications");
  for (let publication of publications) {
    let entry = document.getElementById("entry").content.cloneNode(true);
    let fields = entry.querySelectorAll("dt, dd");
    fields[0].textContent = publication.title;
    fields[1].textContent = publication.name;
    fields[2].textContent = publication.summary;
    list.appendChild(entry)
  }
}