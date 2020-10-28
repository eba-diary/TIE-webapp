/**
 * @fileoverview Autofills report-issue fields when URL query string contains a publication ID
 */

init();

/**
 * Autofills the fields in the report-issue form
 */
function init() {
  const urlParams = new URLSearchParams(window.location.search);
  document.getElementById("publication-id").value = urlParams.get("publicationId")
  document.getElementById("publication-title").value = urlParams.get("publicationTitle")
}