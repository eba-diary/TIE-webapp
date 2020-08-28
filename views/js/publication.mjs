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
  fetch("/api/publications/" + id)
    .then(checkStatus)
    .then(res => res.json())
    .then(json => showPublication(json));
}

function showPublication(publication) {
  document.getElementById("title").textContent = publication["title"];
  let moreInfoFields = ["travel_dates", "publisher", "publication_place", "publication_date",
    "publisher_misc", "summary"];
  for (let field of moreInfoFields) {
    let display = document.getElementById(field.replace("_", "-"));
    if (publication[field] !== null) {
      display.textContent = publication[field];
      display.parentNode.classList.remove("d-none");
    }
  }
  let iiifURL = publication["iiif"];
  Mirador.viewer({
    id: "mirador-viewer",
    manifests: {
      iiifURL: {
        provider: "Internet Archive"
      }
    },
    windows: [
      {
        loadedManifest: iiifURL,
        canvasIndex: 2,
      }
    ],
    window: {
      allowClose: false,
      defaultSideBarPanel: 'info',
      defaultView: 'gallery',
      sideBarOpenByDefault: false,
      hideWindowTitle: true
    },
    thumbnailNavigation: {
      defaultPosition: 'off',
    },
    workspaceControlPanel: {
      enabled: false,
    },
  });
}