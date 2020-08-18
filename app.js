/**
 * @fileoverview Entry point for the server running the Travelers in Egypt web app
 */

"use strict";
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const express = require("express");
const config = require("./config.json");

const app = express();

app.get("/api/publication/:id", async function(req, res){
  res.type("json");
  try {
    let db = await getDB();
  }
});

async function getDB() {
  return await sqlite.open({
    filename: config["db_filename"],
    driver: sqlite3.Database
  });
}

app.listen(process.env.PORT || config["port"]);