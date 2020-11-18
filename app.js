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
 * @apiSuccess {String}   url                   (Tentatively unassigned; see https://github.com/eba-diary/Travelogues-db-conversion/wiki/Overview-of-tables#publications)
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
    let rows = await db.all(`SELECT p.id, trim(p.title) title, p.summary, t.id traveler_id,
                              t.name traveler_name, c.type contribution_type
                            FROM contributions c
                            INNER JOIN publications p ON p.id = c.publication_id
                            INNER JOIN travelers t on t.id = c.traveler_id
                            ORDER BY title
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
 * @api {get} /api/decades/ Get a list of decades and the publications whose travels start in it
 * @apiName   GetDecadeList
 * @apiGroup  Publications
 * 
 * @apiSuccess {Object[]} decades                 List of decades with publications
 * @apiSuccess {Number}   decades.start_year      Starting year of the decade
 * @apiSuccess {Object[]} decades.publications    Publications in this decade, in ascending order
 * @apiSuccess {Number}   publications.id         Publication ID
 * @apiSuccess {String}   publications.title      Title
 * @apiSuccess {String}   publications.summary    Summary
 * @apiSuccess {Object[]} publications.travelers  Traveler ID
 * @apiSuccess {String}   travelers.id            Traveler id
 * @apiSuccess {String}   travelers.name          Traveler name
 * @apiSuccess {String}   travelers.type          Type of contribution traveler made to publication
 */
app.get("/api/decades/", async function(req, res, next){
  res.type("json");
  try{
    let db = await getDB();
    let rows = await db.all(`SELECT p.id, p.title, p.summary, p.travel_year_min, p.travel_dates,
                            t.id traveler_id, t.name traveler_name, c.type contribution_type
                            FROM contributions c
                            INNER JOIN publications p ON p.id = c.publication_id
                            INNER JOIN travelers t on t.id = c.traveler_id
                            ORDER BY p.travel_year_min
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
    let decades = new Map();
    for (let publication of publications.values()) {
      let yearMin = publication["travel_year_min"];
      let decade;
      if (yearMin === null || yearMin < 1000) decade = yearMin
      else decade = Math.floor(yearMin/10);
      delete publication["travel_year_min"];

      if (decades.has(decade)) {
        decades.get(decade).publications.push(publication)
      } else {
        decades.set(decade, {
          decade: decade,
          publications: [publication]
        });
      }
    }
    decades = Array.from(decades.values()).sort((a, b) => a.decade - b.decade);
    res.send(decades);
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
 * @api {get} /api/searchpagedata Get data used to populate advanced options of search
 * @apiname SearchPageData
 * @apiGroup SearchPage
 * 
 * @apiSuccess {String[]} author_roles  List of contribution types/author roles
 * @apiSuccess {String[]} genders       List of genders
 * @apiSuccess {String[]} nationalities List of nationalities
 */
app.get("/api/searchpagedata", async function(req, res, next) {
  res.type("json");
  try {
    let db = await getDB();
    let author_roles = await db.all(
      "SELECT DISTINCT type FROM contributions ORDER BY type COLLATE NOCASE");
    let genders = await db.all(
      "SELECT DISTINCT gender FROM travelers ORDER BY gender COLLATE NOCASE ASC");
    let nationalities = await db.all(
      "SELECT DISTINCT REPLACE(nationality, '(?)', '') n FROM travelers ORDER BY n COLLATE NOCASE");
    res.send({
      author_roles: removeNulls(flattenDBResult(author_roles)),
      genders: removeNulls(flattenDBResult(genders)),
      nationalities: removeNulls(flattenDBResult(nationalities))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @api {get} /api/search/ Get a list of publications that match the search criteria
 * @apiName Search
 * @apiGroup Publications
 * 
 * @apiParam {String} [title]           Match titles that contain all words in this string
 * @apiParam {String} [summary]         Match summaries that contain all words in this string
 * @apiParam {String} [traveldate-min]  Match publications detailing travels on or after this year
 * @apiParam {String} [traveldate-max]  Match publications detailing travels on or before this year
 * @apiParam {String} [include-unknown] Match publications with unknown end travel date; "on" if yes
 * @apiParam {String} [readable]        Match publications that can be read in the app; "on" if yes
 * @apiParam {String} [traveler]        Match travelers that contain all names in this string
 * @apiParam {String} [nationality]     Match travelers with this nationality
 * @apiParam {String} [gender]          Match travelers with this gender
 * @apiParam {String[]} [role]          Match travelers with these roles
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
    let sqlParams = {
      $title: processFTSQueries(req.query["title"]),
      $summary: processFTSQueries(req.query["summary"]),
      $traveler: processFTSQueries(req.query["traveler"]),
      $nationality: undefinedIfEmptyString(req.query["nationality"]),
      $gender: undefinedIfEmptyString(req.query["gender"]),
      $readable: undefinedIfEmptyString(req.query["readable"])
    };

    /*
      The role placeholder thing is a workaround to node-sqlite3 not supporting array parameters:
      https://github.com/mapbox/node-sqlite3/issues/762
      The following code implements the workaround suggested in an issue comment, but with named
      parameters instead:
      https://github.com/mapbox/node-sqlite3/issues/762#issuecomment-688529227
      The named parameters use the *index* of the role in the role array as part of its name instead
      of the role name itself to prevent SQL injections.
    */
    let roles = undefinedIfEmptyString(req.query["role"]);
    let rolePlaceholderString = "";
    if (roles !== undefined) {
      if (!Array.isArray(roles)) {
        roles = [roles]
      }
      let placeholders = [...Array(roles.length).keys()] //equivalent to range(len(roles)) in Python
        .map(number => "$role" + number);
      rolePlaceholderString = placeholders.join(",");
      for (let i = 0; i < roles.length; i++) {
        sqlParams[placeholders[i]] = roles[i];
      }
    } else {
      sqlParams["$role0"] = undefined;
    }

    /* The following rows that contain something like
      WHERE $title IS NULL OR rowid IN (SELECT rowid FROM publicationsfts WHERE title MATCH $title)
      is an evil hack that replaces the much cleaner
      WHERE $TITLE IS NULL OR title MATCH $title
      which I am unable to use because of a weird sqlite bug. The hack comes from here:
      http://sqlite.1065341.n5.nabble.com/FTS3-bug-with-MATCH-plus-OR-td50714.html
    */
    let matches = await db.all(
      ` SELECT publication_id id, title, travel_dates, name traveler_name,
          traveler_id, type contribution_type, travel_year_min, travel_year_max
        FROM contributions c
        INNER JOIN (
          SELECT pfts.rowid, p.title, p.travel_dates, p.travel_year_min, p.travel_year_max, p.iiif
          FROM publicationsfts pfts
          INNER JOIN publications p ON pfts.rowid = p.id
          WHERE ($title IS NULL OR pfts.rowid IN (SELECT rowid FROM publicationsfts WHERE title MATCH $title))
            AND ($summary IS NULL OR pfts.rowid IN (SELECT rowid FROM publicationsfts WHERE summary MATCH $summary))
            AND ($readable IS NULL OR p.iiif IS NOT NULL)
        ) pubftsmatches
          ON pubftsmatches.rowid = c.publication_id
        INNER JOIN travelers t ON t.id = c.traveler_id
        WHERE publication_id IN (
          SELECT c.publication_id FROM travelersfts tfts
          INNER JOIN travelers t ON tfts.rowid = t.id
          INNER JOIN contributions c ON tfts.rowid = c.traveler_id
          WHERE ($traveler IS NULL OR tfts.rowid IN (SELECT rowid FROM travelersfts WHERE name MATCH $traveler))
            AND ($nationality IS NULL OR tfts.rowid IN (SELECT rowid FROM travelersfts WHERE nationality MATCH $nationality))
            AND ($gender IS NULL OR gender = $gender)
            AND ($role0 IS NULL OR type IN (${rolePlaceholderString}))
        )
        ORDER BY title COLLATE NOCASE ASC`,
        sqlParams);
    let publications = new Map();
    let search_min = undefinedIfEmptyString(req.query["traveldate-min"]);
    let search_max = undefinedIfEmptyString(req.query["traveldate-max"]);
    let include_unknown = req.query["include-unknown"] === "on";
    for (let publication of matches) {
      if (matchesDateRange(publication, search_min, search_max, include_unknown)) {
        let traveler = {
          id: publication.traveler_id,
          name: publication.traveler_name,
          type: publication.contribution_type
        };
        if (publications.has(publication.id)) {
          publications.get(publication.id).travelers.push(traveler);
        } else {
          publication.travelers = [traveler];
          ["traveler_id", "traveler_name", "contribution_type",
            "travel_year_min", "travel_year_max"].forEach(prop => delete publication[prop])
          publications.set(publication.id, publication)
        }
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

/**
 * Escape quotes and wrap each word as a query literal for FTS5.
 * @param {String} query query to escape
 * @return {String} escaped query
 */
function ftsEscape(query) {
  if (query === undefined) return query;
  query = query.replace(/"/g, '""');
  return query.split(" ")
    .map(token => `"${token}"`)
    .join(" ");
}

/**
 * Process FTS string search queries to they can be put in an SQLite prepared statements
 * @param {String} query query to process
 * @return {String} processed query
 */
function processFTSQueries(query) {
  return ftsEscape(undefinedIfEmptyString(query))
}

/**
 * Flattens a DB result array so that it only contains value
 * @param {Object[]} array Array recieved from DB query
 * @returns {Object[]} Flattened array
 */
function flattenDBResult(array) {
  let out = [];
  array.forEach(item => out.push(Object.values(item)[0]));
  return out;
}

/**
 * Removes nulls from an array
 * @param {(null|Object)[]} string Array of null and other values
 * @return {Object[]} Same array, but with no null values
 */
function removeNulls(array) {
  return array.filter(value => value !== null);
}

/**
 * Check if a publication falls within the search date range [search_min, search_max].
 * If a publication has no max, this returns true if include_unknown is true unless the publication
 * min is greater than search_max.
 * If a publication has a 3 digit min (i.e. the precise start date is unknown), this returns true
 * if it could exist in the same decade as the search date range.
 * This always returns true if include_unknown is true and the publication has neither a min or max.
 * @param {Object}            publication     Publication to check
 * @param {undefined|Number}  search_min      Minimum search year
 * @param {undefined|Number}  search_max      Maximum search year
 * @param {Boolean}           include_unknown Whether to include publications with unknown end dates
 */
function matchesDateRange(publication, search_min, search_max, include_unknown) {
  return (search_min === undefined || ( //don't check minimum year if we didn't set search_min
    (publication.travel_year_min >= 1000 && publication.travel_year_min >= search_min) || //if min year has >3 digits, check normally
    (publication.travel_year_min < 1000 && Math.floor(search_min/10) == publication.travel_year_min) //if min year has 3 digits (precise year unknown), include if same decade
  )) &&
  (search_max === undefined || (  //don't check maximum year if we didn't set search_max
    (publication.travel_year_max !== null && publication.travel_year_max <= search_max) || //if the publication has a year set, search check normally
    (include_unknown && publication.travel_year_max === null && //if publication has no end date, include if include_unknown is true
      publication.travel_year_min <= search_max && //don't include results where search_max is greater than the publication's min travel year
      (publication.travel_year_min >= 1000 || Math.floor(search_max/10) >= publication.travel_year_min)) //if the min travel year has 3 digits, don't include if the max's decade is greater
  ));
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