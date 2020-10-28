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
  const reportUrl = new URL("/report-issue", window.location.origin);
  reportUrl.searchParams.append("publicationId", publication["id"])
  reportUrl.searchParams.append("publicationTitle", publication["title"])
  document.getElementById("report-btn").href = reportUrl.href;
  document.getElementById("report-btn").classList.remove("d-none");

  document.getElementById("title").textContent = publication["title"];
  document.title = "Nile Travelogues - " + publication["title"];
  let moreInfoFields = ["travel_dates", "publisher", "publication_place", "publication_date",
    "publisher_misc", "summary", "id"];
  for (let field of moreInfoFields) {
    let display = document.getElementById(field.replace("_", "-"));
    if (publication[field] !== null) {
      display.textContent = publication[field];
      display.parentNode.classList.remove("d-none");
    }
  }
  for (let contributor of publication["travelers"]) {
    let authorList = document.getElementById("authors");
    let author = document.createElement("li");
    let nameDisplay = contributor.name +
      (contributor.type === "Author" ? "" : ` (${contributor.type})`);
    author.textContent = nameDisplay;
    authorList.appendChild(author);
  }
  let iiifURL = publication["iiif"];
  if (iiifURL) {
    affixScriptToHead("https://unpkg.com/mirador@rc/dist/mirador.min.js", function() {
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
    })
  } else {
    document.getElementById("no-iiif-alert").classList.remove("d-none");
    document.getElementById("publication-details").open = true;
  }
}

/**
 * Throw an error if a script failed to load.
 * From examples section in https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement
 * @param {Error} oError script loading error object
 */
function loadError(oError) {
  throw new URIError("The script " + oError.target.src + " didn't load correctly.");
}

/**
 * Dynamically load a script
 * From examples section in https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement
 * @param {String} url URL of script source
 * @param {Function} onloadFunction callback function to run when script loads
 */
function affixScriptToHead(url, onloadFunction) {
  var newScript = document.createElement("script");
  newScript.onerror = loadError;
  if (onloadFunction) { newScript.onload = onloadFunction; }
  document.head.appendChild(newScript);
  newScript.src = url;
}