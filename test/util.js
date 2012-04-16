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

var query_string = function() {
  return "string";
}

var query_array = function() {
  return ["array"];
}

var query_object = function(query) {
  return query.sql("object");
}

var query_false = function(query) {
  return false;
}

module.exports = {
  get_default_driver: get_default_driver,
  get_driver: get_driver,
  query_string: query_string,
  query_array: query_array,
  query_object: query_object,
  query_false: query_false,
}

