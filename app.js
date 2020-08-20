/**
 * @fileoverview Entry point for the server running the Travelers in Egypt web app
 */

"use strict";
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const express = require("express");
const { handleError, HandleableError } = require("./helpers/errorhandler")
const config = require("./config.json");

const app = express();

/**
 * @api {get} /api/publications/:id Get publication information
 * @apiName   GetPublication
 * @apiGroup  Publications
 * 
 * @apiParam {Number} id Publication's unique ID
 * @apiSuccess {Number} id                    Publication ID
 * @apiSuccess {String} title                 Publication title
 * @apiSuccess {String} travel_dates          Date or date range of travel
 * @apiSuccess {String} publisher             Publisher name
 * @apiSuccess {String} publication_place     Place of publication
 * @apiSuccess {String} publication_date      Date of publication
 * @apiSuccess {String} publisher_misc        Miscellaneous publication info
 * @apiSuccess {String} summary               Summary of the publication
 * @apiSuccess {String} url                   Internet Archive URL
 * @apiSuccess {String} iiif                  IIIF manifest URL
 * @apiSuccess {Object} traveler              Traveler information
 * @apiSuccess {Object} traveler.name         Traveler name
 * @apiSuccess {Object} traveler.nationality  Traveler's nationality
 */
app.get("/api/publications/:id", async function(req, res, next){
  res.type("json");
  try {
    let publicationId = req.params["id"];
    let db = await getDB();
    let info = await db.get(`SELECT p.id, p.title, p.travel_dates, p.publisher, p.publication_place,
                        p.publication_date, p.publisher_misc, p.summary, p.url, p.iiif, t.name,
                        t.nationality
                      FROM publications p
                      INNER JOIN travelers t
                      ON p.traveler_id == t.id
                      WHERE p.id == ?`, [publicationId])
    db.close();
    if (info === undefined) {
      throw new HandleableError(404, `Publication ID ${publicationId} doesn't exist`);
    } else {
      info.traveler = {name: info.name, nationality: info.nationality}
      delete info.name;
      delete info.nationality;
      res.send(info);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @api {get} /api/publications/ Get a list of publications
 * @apiName   GetPublicationList
 * @apiGroup  Publications
 * 
 * @apiParam {Number} [offset=0]  Pagination offset; returned entries will have greater IDs
 * @apiParam {Number} count       Number of entries to return
 * @apiSuccess {Object[]} publications          List of publications
 * @apiSuccess {String}   publications.title    Title
 * @apiSuccess {String}   publications.summary  Summary
 * @apiSuccess {String}   publications.author   Author
 * @apiSuccess {Number}   next_offset           Next pagination offset
 */
app.get("/api/publications/", async function(res, req, next){
  res.type("json");
  try{
    let offset = req.query["offset"];
    let db = await getDB();
  } catch (error) {
    next(error);
  }
});

/**
 * Parses a client-received parameter as an int, defaulting to a given value if undefined and
 * throwing an error if it's defined but not an int
 * @param {String} paramName    Name of the parameter
 * @param {String} paramValue   Value of the paramater received from client
 * @param {Number} defaultValue If parameter value was undefined, return this default value 
 */
function parseOptionalIntParam(paramName, paramValue, defaultValue) {
  let returnValue = paramValue === undefined ? defaultValue : parseInt(paramValue);
  if (isNaN(returnValue)) {
    throw new HandleableError(400, `Provided ${paramName} "${paramValue}" is not an integer.`)
  }
  return returnValue;
}

async function getDB() {
  return await sqlite.open({
    filename: config["db_filename"],
    driver: sqlite3.Database
  });
}

app.use(function(err, req, res, next) {
  handleError(err, res);
});

app.listen(process.env.PORT || config["port"]);