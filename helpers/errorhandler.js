const { response } = require("express");

class HandleableError extends Error {
  /**
   * Creates a handleable error
   * @param {Number} httpStatus   HTTP status code
   * @param {String} message      Error message
   */
  constructor(httpStatus, message) {
    super();
    this.httpStatus = httpStatus;
    this.message = message;
  }
}

const handleError = (err, res) => {
  console.log(err);
  let status;
  let responseBody;
  if ("httpStatus" in err) {
    status = err.httpStatus;
    responseBody = {status, message: err.message}
  } else {
    status = 500;
    responseBody = {status, message: "Internal server error"}
  }
  res.status(status)
    .type("json")
    .send(responseBody);
};

module.exports = {HandleableError, handleError};