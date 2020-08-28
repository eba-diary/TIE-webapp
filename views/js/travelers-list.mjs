/**
 * @fileoverview publications-list.mjs gets and shows a list of travelers and their publications in the Travelogues DB
 */
import checkStatus from "./check-status.mjs";

"use strict";
window.addEventListener("load", init);

/**
 * Initializes the page, fetching the traveler list
 */
function init() {
  fetch("/api/travelers")
    .then(checkStatus)
    .then(res => res.json())
    .then(json => showTravelers(json))
}

/**
 * Adds the travelers to the list on the page
 */
function showTravelers(travelers) {
  let travelerList = document.getElementById("travelers");
  for (let traveler of travelers) {
    let entry = document.getElementById("entry").content.cloneNode(true);
    entry.querySelector(".author").textContent = traveler["name"];
    entry.querySelector(".nationality").textContent = traveler["nationality"];
    let pubList = entry.querySelector(".publications");
    for (let publication of traveler["publications"]) {
      let pubEntry = document.createElement("li");
      pubEntry.textContent = publication["title"];
      pubList.append(pubEntry);
    }
    travelerList.appendChild(entry);
  }
}