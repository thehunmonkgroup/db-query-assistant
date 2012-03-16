var driver = require('db-drizzle');
module.exports = function(debug_log, debug) {
  return require('../../include/node-db')(driver, debug_log, debug);
}

