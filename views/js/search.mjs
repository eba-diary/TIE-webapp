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
  getSearchResults((new URL(document.location)).searchParams);
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
  ["gender", "nationality"].forEach(param => {
    if (searchParams.get(param) === "UNKNOWN") {
      searchParams.set(param, null)
    }
  });
  fetch("/api/search?" + searchParams.toString())
    .then(checkStatus)
    .then(res => res.json())
    .then(json => console.log(json)) //TODO: actually display results
}