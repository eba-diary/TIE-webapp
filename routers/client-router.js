/**
 * @fileoverview client-router.js - Express router for front-end, client pages
 */

 const express = require("express");
 const router = express.Router();

router.use("/js", express.static("views/js"));
router.use("/css", express.static("views/css"));

router.get("/", function(req, res){
  res.render("pages/home");
});

router.get("/publications-list", function(req, res){
  res.render("pages/publications-list");
});

router.get("/travelers-list", function(req, res){
  res.render("pages/travelers-list");
});

router.get("/publication", function(req, res){
  res.render("pages/publication");
});

module.exports = router;