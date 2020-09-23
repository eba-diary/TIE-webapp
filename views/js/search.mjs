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
}

/**
 * Populate search fields with limited numbers of options
 * @param data {Object} search page data from SearchPageData API
 */
function populateSearchForm(data) {
  for (let roleName of data["author_roles"]) {
    let role = document.getElementById("role").content.cloneNode(true);
    role.querySelector("label").textContent = roleName;
    document.getElementById("author-roles").appendChild(role);
  }
}