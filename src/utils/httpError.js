// src/utils/httpError.js
function httpError(message, statusCode = 500, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}

module.exports = httpError;
