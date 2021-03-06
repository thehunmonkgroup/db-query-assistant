var db_pool = require('../../db-query-assistant');
//db_pool.debug(true);
var config = require('./config.dummy');

var get_default_driver = function() {
  var db = db_pool.create('dummy');
  return db;
}

var get_driver = function() {
  var db = db_pool.create('dummy', config.db, config.db_pool);
  return db;
}

var query_string = function() {
  return "string";
}

var query_array = function() {
  return ["array"];
}

var query_object = function(query) {
  query.sql("object");
}

var query_false = function(query) {
  return false;
}

var query_error = function(query) {
  return "ERROR";
}

module.exports = {
  get_default_driver: get_default_driver,
  get_driver: get_driver,
  query_string: query_string,
  query_array: query_array,
  query_object: query_object,
  query_false: query_false,
  query_error: query_error,
}

