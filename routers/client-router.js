/**
 * @fileoverview client-router.js - Express router for front-end, client pages
 */

const express = require("express");
const router = express.Router();

// Names of pages to expose to the front-end by directly going to them
const PAGES = [
  "home",
  "publication",
  "publications-list",
  "travelers-list",
  "search"
]

router.use("/js", express.static("views/js"));
router.use("/css", express.static("views/css"));

router.get("/:page", function(req, res){
  if (PAGES.includes(req.params.page)) {
    res.render("pages/" + req.params.page);
  } else {
    res.status(404).render("pages/404");
  }
});
module.exports = router;