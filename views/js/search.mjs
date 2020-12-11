/**
 * @fileoverview search.js populates the search page, sends search queries to API, and shows results
 */
import checkStatus from "./check-status.mjs";

init();

/**
 * Initialize the page by populating search options and activating the form
 */
function init() {
  fetch("/api/searchpagedata")
    .then(checkStatus)
    .then(res => res.json())
    .then(data => populateSearchForm(data));
  let searchParams = (new URL(document.location)).searchParams;
  if (!searchParams.entries().next().done) {
    getSearchResults(searchParams);
  }
  document.getElementById("search-btn").addEventListener("click", function(event) {
    event.preventDefault();
    let searchParams = new URLSearchParams(new FormData(document.querySelector("form")));
    history.pushState(null, null, "?" + searchParams.toString());
    getSearchResults(searchParams);
  });
}

/**
 * Populate search fields with limited numbers of options
 * @param data {Object} search page data from SearchPageData API
 */
function populateSearchForm(data) {
  for (let roleName of data["author_roles"]) {
    let roleId = "role-" + roleName.toLowerCase();
    let role = document.getElementById("role").content.cloneNode(true);
    let checkbox = role.querySelector("input");
    checkbox.id = roleId;
    checkbox.name = "role";
    checkbox.value = roleName;
    let label = role.querySelector("label")
    label.textContent = roleName;
    label.setAttribute("for", roleId)
    document.getElementById("author-roles").appendChild(role);
  }

  populateDropdowns("gender", data["genders"]);
  populateDropdowns("nationality", data["nationalities"]);
}

/**
 * Add options from an array to a dropdown
 * @param dropdownId {String} ID of the dropdown to add options to
 * @param options {String[]} options to add
 */
function populateDropdowns(dropdownId, options) {
  let dropdown = document.getElementById(dropdownId);
  for (let optionName of options) {
    let option = document.createElement("option");
    option.value = optionName;
    option.textContent = optionName;
    dropdown.appendChild(option);
  }
}

/**
 * Get search results
 * @param searchParams {URLSearchParams} URL search params for publication search
 */
function getSearchResults(searchParams) {
  fetch("/api/search?" + searchParams.toString())
    .then(checkStatus)
    .then(res => res.json())
    .then(results => showResults(results));
}

/**
 * Shows the search results in the results table
 * @param {Object[]} publications list of publications that matched the search query
 */
function showResults(publications) {
  let resultsTable = document.getElementById("results");
  let resultsBody = resultsTable.querySelector("tbody");
  resultsBody.innerHTML = "";
  resultsTable.classList.remove("d-none");
  for (let publication of publications) {
    let result = document.getElementById("result").content.cloneNode(true);

    let title = result.querySelector(".title");
    title.href = "/publication?id=" + publication.id;
    title.textContent = publication.title;
    if (publication.canread === 1) result.querySelector(".readable").classList.remove("d-none");

    let authorList = result.querySelector(".author");
    for (let traveler of publication.travelers) {
      let author = document.createElement("li");
      author.textContent = traveler.name +
        (traveler.type === "Author" ? "" : ` (${traveler.type})`);
      authorList.appendChild(author);
    }

    result.querySelector(".travel-dates").textContent = publication.travel_dates;

    resultsBody.appendChild(result);
  }
}