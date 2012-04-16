var db_pool = require('../../db-query-assistant');
var config = require('./config.dummy');

var get_default_driver = function() {
  var db = db_pool.create('dummy');
  return db;
}

var get_driver = function() {
  var db = db_pool.create('dummy', config.db, config.db_pool);
  return db;
}

module.exports = {
  get_default_driver: get_default_driver,
  get_driver: get_driver,
}

