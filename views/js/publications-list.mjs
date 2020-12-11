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
  let indexedLetters = [];
  for (let publication of publications) {
    let firstLetter = publication.title.charAt(0).toUpperCase();
    let injectAnchorID = false;
    if (!indexedLetters.includes(firstLetter)) {
      indexedLetters.push(firstLetter);
      injectAnchorID = true;
    }

    let entry = document.getElementById("entry").content.cloneNode(true);
    if (injectAnchorID) entry.querySelector(".title").id = "startswith-" + firstLetter;
    entry.querySelector(".title").textContent = publication.title;
    entry.querySelector(".title").href = "/publication?id=" + publication.id;
    if (publication.canread === 1) entry.querySelector(".readable").classList.remove("d-none");
    entry.querySelector(".summary").textContent = publication.summary;
    let authorList = entry.querySelector(".author");
    for (let contributor of publication.travelers) {
      if (contributor.type === "Author") {
        let author = document.createElement("li");
        author.textContent = contributor.name;
        authorList.appendChild(author);
      }
    }
    list.appendChild(entry)
  }

  document.getElementById("loadingmsg").remove();

  for (let letter of indexedLetters) {
    let anchor = document.createElement("a");
    anchor.textContent = letter;
    anchor.href = "#startswith-" + letter;
    anchor.classList.add("index-link");
    document.getElementById("index").appendChild(anchor)
  }
}