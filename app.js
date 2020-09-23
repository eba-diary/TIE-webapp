/**
 * @fileoverview Entry point for the server running the Nile Travelogues web app
 */

"use strict";
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const express = require("express");
const { handleError, HandleableError } = require("./helpers/errorhandler")
const clientRouter = require("./routers/client-router");
const config = require("./config.json");

const app = express();
app.set("view engine", "ejs");

app.use("/", clientRouter);

/**
 * @api {get} /api/publications/:id Get publication information
 * @apiName   GetPublication
 * @apiGroup  Publications
 * 
 * @apiParam {Number} id Publication's unique ID
 * @apiSuccess {Number}   id                    Publication ID
 * @apiSuccess {String}   title                 Publication title
 * @apiSuccess {String}   travel_dates          Date or date range of travel
 * @apiSuccess {String}   publisher             Publisher name
 * @apiSuccess {String}   publication_place     Place of publication
 * @apiSuccess {String}   publication_date      Date of publication
 * @apiSuccess {String}   publisher_misc        Miscellaneous publication info
 * @apiSuccess {String}   summary               Summary of the publication
 * @apiSuccess {String}   url                   Internet Archive URL
 * @apiSuccess {String}   iiif                  IIIF manifest URL
 * @apiSuccess {Object[]} travelers             Info on each contributing traveler to the publciation
 * @apiSuccess {Number}   travelers.id          Traveler id
 * @apiSuccess {String}   travelers.name        Traveler name
 * @apiSuccess {String}   travelers.nationality Traveler's nationality
 * @apiSuccess {String}   travelers.gender      Traveler's nationality
 * @apiSuccess {String}   travelers.type        Type of traveler's contribution to the publication
 */
app.get("/api/publications/:id", async function(req, res, next){
  res.type("json");
  try {
    let publicationId = req.params["id"];
    let db = await getDB();
    let info = await db.get(`SELECT p.id, p.title, p.travel_dates, p.publisher, p.publication_place,
                              p.publication_date, p.publisher_misc, p.summary, p.url, p.iiif
                            FROM contributions c
                            INNER JOIN publications p ON p.id = c.publication_id
                            WHERE p.id = ?`, [publicationId]);
    let contributors = await db.all(`SELECT t.id, t.name, t.gender, c.type FROM contributions c
                                    INNER JOIN travelers t ON t.id = c.traveler_id
                                    WHERE c.publication_id = ?`, [publicationId])
    db.close();
    if (info === undefined) {
      throw new HandleableError(404, `Publication ID ${publicationId} doesn't exist`);
    } else {
      info.travelers = contributors;
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
 * @apiSuccess {Object[]} publications            List of publications
 * @apiSuccess {Number}   publications.id         Publication ID
 * @apiSuccess {String}   publications.title      Title
 * @apiSuccess {String}   publications.summary    Summary
 * @apiSuccess {Object[]} publications.travelers  Traveler ID
 * @apiSuccess {String}   travelers.id            Traveler id
 * @apiSuccess {String}   travelers.name          Traveler name
 * @apiSuccess {String}   travelers.type          Type of contribution traveler made to publication
 */
app.get("/api/publications/", async function(req, res, next){
  res.type("json");
  try{
    let db = await getDB();
    let rows = await db.all(`SELECT p.id, p.title, p.summary, t.id traveler_id,
                              t.name traveler_name, c.type contribution_type
                            FROM contributions c
                            INNER JOIN publications p ON p.id = c.publication_id
                            INNER JOIN travelers t on t.id = c.traveler_id
                            ORDER BY p.title
                            COLLATE NOCASE ASC`);
    db.close();
    let publications = new Map();
    for (let publication of rows) {
      let traveler = {
        id: publication.traveler_id,
        name: publication.traveler_name,
        type: publication.contribution_type
      };
      if (publications.has(publication.id)) {
        publications.get(publication.id).travelers.push(traveler);
      } else {
        publication.travelers = [traveler];
        delete publication.traveler_id;
        delete publication.traveler_name;
        delete publication.contribution_type;
        publications.set(publication.id, publication)
      }
    }
    res.send(Array.from(publications.values()));
  } catch (error) {
    next(error);
  }
});

/**
 * @api {get} /api/travelers/ Get a list of travelers and their publications in alphabetical order
 * @apiName GetTravelerList
 * @apiGroup Travelers
 * 
 * @apiSuccess {Object[]} travelers                   List of travelers
 * @apiSuccess {String}   travelers.id                Traveler ID
 * @apiSuccess {String}   travelers.name              Traveler name
 * @apiSuccess {String}   travelers.nationality       Traveler's nationality
 * @apiSuccess {Object[]} travelers.publications      List of this traveler's publications
 * @apiSuccess {Number}   publications.id             Publication ID
 * @apiSuccess {String}   publications.title          Publication title
 * @apiSuccess {String}   publications.contribution   Type of contribution traveler made to the publication
 */
app.get("/api/travelers/", async function(req, res, next){
  res.type("json");
  try {
    let db = await getDB();
    let rows = await db.all(`SELECT t.id, t.name, t.nationality,
                              c.type contribution_type, p.id publication_id,
                              p.title publication_title
                            FROM travelers t
                            LEFT JOIN contributions c ON t.id == c.traveler_id
                            INNER JOIN publications p ON c.publication_id == p.id
                            ORDER BY name COLLATE NOCASE ASC`);
    db.close();
    let travelers = new Map();
    for (let traveler of rows) {
      let publication = {
        id: traveler.publication_id,
        title: traveler.publication_title,
        contribution: traveler.contribution_type
      };
      if (travelers.has(traveler.id)) {
        travelers.get(traveler.id).publications.push(publication);
      } else {
        traveler.publications = [publication];
        delete traveler.publication_id;
        delete traveler.publication_title;
        delete traveler.contribution_type;
        travelers.set(traveler.id, traveler)
      }
    }
    res.send(Array.from(travelers.values()));
  } catch (error) {
    next(error);
  }
});

/**
 * @api {get} /api/search/ Get a list of publications that match the search criteria
 * @apiName Search
 * @apiGroup Publications
 * 
 * @apiParam {String} [title]         Match titles that contain all words in this string
 * @apiParam {String} [summary]       Match summaries that contain all words in this string
 * @apiParam {String} [traveler]      Match travelers that contain all names in this string
 * @apiParam {String} [nationality]   Match travelers with this nationality
 * @apiSuccess {Object[]} publications            List of publications matching search criteria
 * @apiSuccess {String}   publications.title      Publication title
 * @apiSuccess {Object[]} publications.travelers  List of travelers contributing the publication
 * @apiSuccess {Number}   travelers.id            Traveler ID
 * @apiSuccess {String}   travelers.name          Traveler name
 * @apiSuccess {String}   travelers.type            Type of contribution made
 */
app.get("/api/search", async function(req, res, next) {
  res.type("json");
  try {
    let db = await getDB();
    /* The following rows that contain something like
      WHERE $title IS NULL OR rowid IN (SELECT rowid FROM publicationsfts WHERE title MATCH $title)
      is an evil hack that replaces the much cleaner
      WHERE $TITLE IS NULL OR title MATCH $title
      which I am unable to use because of a weird sqlite bug. The hack comes from here:
      http://sqlite.1065341.n5.nabble.com/FTS3-bug-with-MATCH-plus-OR-td50714.html
    */
    let matches = await db.all(`SELECT publication_id id, title, summary, name traveler_name,
                                  traveler_id, type contribution_type
                                FROM contributions c
                                INNER JOIN (
                                    SELECT rowid, title, summary FROM publicationsfts
                                    WHERE ($title IS NULL OR rowid IN (SELECT rowid FROM publicationsfts WHERE title MATCH $title))
                                      AND ($summary IS NULL OR rowid IN (SELECT rowid FROM publicationsfts WHERE summary MATCH $summary))
                                  ) pubftsmatches
                                  ON pubftsmatches.rowid = c.publication_id
                                INNER JOIN (
                                    SELECT rowid, name FROM travelersfts
                                    WHERE ($traveler IS NULL OR rowid IN (SELECT rowid FROM travelersfts WHERE name MATCH $traveler))
                                      AND ($nationality IS NULL OR rowid IN (SELECT rowid FROM travelersfts WHERE nationality MATCH $nationality))
                                  ) travftsmatches
                                  ON travftsmatches.rowid = c.traveler_id
                                ORDER BY title COLLATE NOCASE ASC`,
                                {
                                  $title: undefinedIfEmptyString(req.query["title"]),
                                  $summary: undefinedIfEmptyString(req.query["summary"]),
                                  $traveler: undefinedIfEmptyString(req.query["traveler"]),
                                  $nationality: undefinedIfEmptyString(req.query["nationality"])
                                });
    let publications = new Map();
    for (let publication of matches) {
      let traveler = {
        id: publication.traveler_id,
        name: publication.traveler_name,
        type: publication.contribution_type
      };
      if (publications.has(publication.id)) {
        publications.get(publication.id).travelers.push(traveler);
      } else {
        publication.travelers = [traveler];
        delete publication.traveler_id;
        delete publication.traveler_name;
        delete publication.contribution_type;
        publications.set(publication.id, publication)
      }
    }
    res.send(Array.from(publications.values()));
  } catch (error) {
    next(error);
  }
});

/**
 * Returns undefined if the input is an empty string, otherwise returns the string
 * @param {String} string String to check for if its empty
 * @return {undefined|String} input string, or undefined if it was empty
 */
function undefinedIfEmptyString(string) {
  return string == "" ? undefined : string;
}

async function getDB() {
  return await sqlite.open({
    filename: config["db_filename"],
    driver: sqlite3.Database
  });
}

app.use(function(err, req, res, next) {
  console.log(err);
  handleError(err, res);
});

app.use(function (req, res) {
  res.status(404).render("pages/404");
})

app.listen(process.env.PORT || config["port"]);