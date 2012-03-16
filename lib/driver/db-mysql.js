/**
 * Loads the db-mysql driver.  See include/node-db.js for more details.
 */
var driver = require('db-mysql');
module.exports = function(debug_log, debug) {
  return require('../../include/node-db')(driver, debug_log, debug);
}

