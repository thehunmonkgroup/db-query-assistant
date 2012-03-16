var _ = require('underscore');

module.exports = function(driver, debug_log, debug) {
  var connect = function(db_settings, query_callback) {
    var db = new driver.Database(db_settings);
    var post_connect = function(err, server) {
      query_callback(err, db);
    }
    db.connect(post_connect);
  }

  var disconnect = function(db) {
    db.disconnect();
  }

  var query_object = function(db) {
    return db.query();
  }

  var execute_query = function(db, query, custom, callback) {
    var execute_callback = function(err, rows, columns) {
      var result = {};
      result.rows = rows;
      result.columns = columns;
      callback(err, result);
    }
    if (custom) {
      var query_string = "";
      var query_values = [];
      if (_.isString(custom)) {
        query_string = custom;
      }
      else {
        query_string = custom.shift();
        query_values = custom;
      }
      if (debug) {
        debug_log("Executing query: " + query_string + ", values: " + query_values.toString());
      }
      query.execute(query_string, query_values, execute_callback);
    }
    else {
      if (debug) {
        debug_log("Executing query: " + query.sql());
      }
      query.execute(execute_callback);
    }
  }
  return {
    connect: connect,
    disconnect: disconnect,
    query_object: query_object,
    execute_query: execute_query,
  }
}

