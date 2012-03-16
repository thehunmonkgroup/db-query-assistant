var _ = require('underscore');

/**
 * Base methods for all node-db based drivers.
 *
 * This also serves as an example of how to build a new driver.
 */
module.exports = function(driver, debug_log, debug) {
  /**
   * Make a new connection to the database.
   *
   * @param db_settings
   *   A hash of settings to pass to node-db. Any parameters accepted by the
   *   Database class are allowed.
   * @param query_callback
   *   The function to call once the connection is established. The following
   *   arguments should be passed to the function:
   *     err: Any error message.
   *     db: The database connection object that other methods can use to
   *         execute queries, etc.
   */
  var connect = function(db_settings, query_callback) {
    var db = new driver.Database(db_settings);
    var post_connect = function(err, server) {
      query_callback(err, db);
    }
    db.connect(post_connect);
  }

  /**
   * Disconnect a database connection.
   *
   * @param db
   *   The database connection object provided by connect().
   *
   * @see connect().
   */
  var disconnect = function(db) {
    db.disconnect();
  }

  /**
   * Build a query object for the user.
   *
   * @param db
   *   The database connection object provided by connect().
   * @return
   *   A query object the user can use to build their query.
   *
   * @see connect().
   */
  var query_object = function(db) {
    return db.query();
  }

  /**
   * Execute a query, and return the results.
   *
   * @param db
   *   The database connection object provided by connect().
   * @param query
   *   The query object provided to the user.
   * @param custom
   *   Any custom query data returned from the user query function.
   * @param callback
   *   The function to call to return the query results, it should be passed
   *   the following arguments:
   *     err: Any error message.
   *     result: An object of result data. In the case of node-db drivers,
   *             this has the following keys:
   *               rows: An array of result objects.
   *               columns: An object describing the table columns of the query.
   *
   * @see connect().
   */
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

