/**
 * @fileoverview Entry point for the server running the Travelers in Egypt web app
 */

"use strict";
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const express = require("express");
const app = express();

const PORT = 8000;
app.listen(process.env.PORT || PORT);