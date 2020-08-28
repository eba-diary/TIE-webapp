/**
 * @fileoverview publications.mjs gets and shows a publication's info, IIIF display, and text.
 *               Which publication is being shows is determined by the id query parameter
 */
import checkStatus from "./check-status.mjs";

"use strict";
window.addEventListener("load", init);

/**
 * Initializes the page, getting publication ID, showing publication info, IIIF display, and text.
 */
function init() {
  let id = new URLSearchParams(window.location.search).get("id");
}