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
    let roleId = "role-" + roleName.toLowerCase();
    let role = document.getElementById("role").content.cloneNode(true);
    let checkbox = role.querySelector("input");
    checkbox.id = roleId;
    checkbox.name = roleId;
    let label = role.querySelector("label")
    label.textContent = roleName;
    label.setAttribute("for", roleId)
    document.getElementById("author-roles").appendChild(role);
  }
}