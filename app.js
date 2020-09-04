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
                      WHERE p.id == ?`, [publicationId]);
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
 * @apiSuccess {Object[]} publications                List of publications
 * @apiSuccess {Number}   publications.id             Publication ID
 * @apiSuccess {String}   publications.title          Title
 * @apiSuccess {String}   publications.summary        Summary
 * @apiSuccess {String}   publications.traveler_id    Traveler ID
 * @apiSuccess {String}   publications.traveler_name  Traveler name
 */
app.get("/api/publications/", async function(req, res, next){
  res.type("json");
  try{
    let db = await getDB();
    let publications = await db.all(`SELECT p.id, p.title, p.summary, t.name traveler_name,
                                      t.id traveler_id
                                    FROM publications p
                                    INNER JOIN travelers t
                                    ON p.traveler_id == t.id
                                    ORDER BY p.title
                                    COLLATE NOCASE ASC`);
    db.close();
    res.send(publications);
  } catch (error) {
    next(error);
  }
});

/**
 * @api {get} /api/travelers/ Get a list of travelers and their publications in alphabetical order
 * @apiName GetTravelerList
 * @apiGroup Travelers
 * 
 * @apiSuccess {Object[]} travelers                      List of travelers
 * @apiSuccess {String}   travelers.id                   Traveler ID
 * @apiSuccess {String}   travelers.name                 Traveler name
 * @apiSuccess {String}   travelers.nationality          Traveler's nationality
 * @apiSuccess {Object[]} travelers.publications         List of this traveler's publications
 * @apiSuccess {Number}   travelers.publications.id      Publication ID
 * @apiSuccess {String}   travelers.publications.title   Publication title
 */
app.get("/api/travelers/", async function(req, res, next){
  res.type("json");
  try {
    let db = await getDB();
    let rows = await db.all(`SELECT t.id traveler_id, t.name, t.nationality,
                              p.id publication_id, p.title
                            FROM travelers t
                            LEFT JOIN publications p
                            ON t.id == p.traveler_id`);
    db.close();
    let travelers = {};
    for (let row of rows) {
      let travelerId = row["traveler_id"];
      if (row["traveler_id"] in travelers) {
        travelers[travelerId]["publications"].push({
          id: row["publication_id"],
          title: row["title"]
        });
      } else {
        travelers[travelerId] = {
          traveler_id: travelerId,
          name: row["name"],
          nationality: row["nationality"],
          publications: []
        };
        if ("publication_id" in row) {
          travelers[travelerId]["publications"].push({
            id: row["publication_id"],
            title: row["title"]
          });
        }
      }
    }
    travelers = Object.values(travelers);
    travelers.sort(function(a, b) {
      let nameA = a.name.toUpperCase();
      let nameB = b.name.toUpperCase();
      if (nameA < nameB) return -1
      if (nameA > nameB) return 1
      return 0;
    });
    res.send(travelers);
  } catch (error) {
    next(error);
  }
});

/**
 * @api {get} /api/search/ Get a list of publications that match the search criteria
 * @apiName Search
 * @apiGroup Publications
 * 
 * @apiParam {String} [title]         Match titles that contain this string
 * @apiParam {String} [traveler]      Match travelers that contain this string
 * @apiParam {String} [nationality]   Match travelers with this nationality
 * @apiSuccess {Object[]} publications          List of publications matching search criteria
 * @apiSuccess {String}   publications.title    Publication title
 * @apiSuccess {String}   publications.traveler Traveler name
 */
app.get("/api/search", async function(req, res, next) {
  res.type("json");
  try {
    let db = await getDB();
    let matches = await db.all(`SELECT p.id, p.title, t.name traveler_name, t.id traveler_id
                                FROM publications p
                                INNER JOIN travelers t
                                ON p.traveler_id == t.id
                                WHERE ($title IS NULL OR p.title LIKE $titlelike)
                                ORDER BY p.title
                                COLLATE NOCASE ASC`,
                                {
                                  $title: req.query["title"],
                                  $titlelike: `%${req.query["title"]}%`
                                });
    res.send(matches);
  } catch (error) {
    next(error);
  }
});

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