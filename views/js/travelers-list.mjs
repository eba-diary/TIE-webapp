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
  let indexedLetters = [];
  for (let traveler of travelers) {
    let firstLetter = traveler["name"].charAt(0);
    let injectAnchorID = false;
    if (!indexedLetters.includes(firstLetter)) {
      indexedLetters.push(firstLetter);
      injectAnchorID = true;
    }

    let entry = document.getElementById("entry").content.cloneNode(true);
    entry.querySelector(".author").textContent = traveler["name"];
    if (injectAnchorID) entry.querySelector(".author").id = "startswith-" + firstLetter;
    entry.querySelector(".nationality").textContent = traveler["nationality"];
    let pubList = entry.querySelector(".publications");
    for (let publication of traveler["publications"]) {
      let pubEntry = document.createElement("li");
      let link = document.createElement("a");
      link.href = "/publication?id=" + publication["id"];
      link.textContent = publication["title"];
      pubEntry.append(link);
      pubList.append(pubEntry);
    }
    travelerList.appendChild(entry);
  }
  for (let letter of indexedLetters) {
    let indexLink = document.getElementById("index-link").content.cloneNode(true);
    let anchor = indexLink.querySelector("a");
    anchor.textContent = letter;
    anchor.href = "#startswith-" + letter;
    document.getElementById("index").appendChild(indexLink)
  }
}