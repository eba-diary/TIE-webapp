# TIE-webapp
Web application for Nile Travelogues, a subproject of the Travelers in Egypt project

# How to run
Requirements: Node.js

You will need the [corresponding SQLite3 database](https://github.com/eba-diary/Travelogues-db-conversion/wiki). Put the DB in the same directory as `app.js` and modify the `db_filename` config in `config.json` to match the filename. Install dependencies with `npm install`, then run `node app.js` to start the app. The website will be served on the PORT environment variable (if it is set) or the port specified in `config.json`.