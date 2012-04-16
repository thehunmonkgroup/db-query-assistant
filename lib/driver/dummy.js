/**
 * Loads the dummy driver.
 *
 * This also serves as an example of how to build a new driver.
 *
 * Optional methods are noted, all others are required.
 *
 * @param debug_log
 *   The logging function for the library.
 * @param debug
 *   Boolean indicating if debugging has been enabled.
 */
module.exports = function(debug_log, debug) {

  /**
   * Optional. Default settings if none are supplied by the user.
   */
  var defaults = {};

  /**
   * Make a new connection to the database.
   *
   * @param db_settings
   *   A hash of settings passed by the user. The driver should document the
   *   settings it needs passed in order to function properly.
   * @param query_callback
   *   The function to call once the connection is established. The following
   *   arguments should be passed to the function:
   *     err: Any error message.
   *     db: The database connection object that other methods can use to
   *         execute queries, etc.
   */
  var connect = function(db_settings, query_callback) {
    var query = function() {
      var query_object = {
        sql_string: "",
      }
      // Provide a simple function set an SQL string on the query object.
      query_object.sql = function(sql) {
        query_object.sql_string = sql;
      }
      return query_object;
    }
    var db = {
      query: query,
      settings: db_settings,
    };
    if (debug) {
      debug_log("Dummy driver connection established");
    }
    query_callback(null, db);
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
    db = null;
    if (debug) {
      debug_log("Dummy driver connection closed");
    }
  }

  /**
   * Optional. Build a query object for the user.
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
   *   The query object provided to the user. This argument is only included
   *   if the driver implements the query_object method, if not then the
   *   function signature would be (db, custom, callback).
   * @param custom
   *   Any custom query data returned from the user query function.
   * @param callback
   *   The function to call to return the query results, it should be passed
   *   the following arguments:
   *     err: Any error message.
   *     result: An object of result data. A common structure could have the
   *             following keys:
   *               rows: An array of result objects.
   *               columns: An object describing the table columns of the query.
   *
   * @see connect().
   */
  var execute_query = function(db, query, custom, callback) {
    // For query results, the dummy driver just echos back the query data
    // provided by the users's query function.
    // Also, if the final query string evaluates to 'ERROR', the driver will
    // return an error for the query.
    var query_data;
    if (custom) {
      query_data = custom;
    }
    else {
      query_data = query.sql_string;
    }
    // Track queries so they can be inspected later.
    query_stack.push(query_data);
    var result = {};
    result.query = query_data;
    if (debug) {
      debug_log("Dummy driver executed query: %s", query_data);
    }
    var err = null;
    if (query_data == 'ERROR') {
      err = 'ERROR';
    }
    callback(err, result);
  }

  /**
   * Optional. The library provides default transaction functions, with the
   * values shown in the commented out code below. To customize these values,
   * implement these functions in your driver.
   *
   * A driver can also return false for all these functions to disable
   * using transactions.
   *
   * var transaction_begin = function() {
   *   return "BEGIN";
   * }
   *
   * var transaction_commit = function() {
   *   return "COMMIT";
   * }
   *
   * var transaction_rollback = function() {
   *   return "ROLLBACK";
   * }
   */

  /**
   * These are custom variables for the dummy driver, they allow the testing
   * framework to inspect the queries that have been run against the driver.
   *
   * Note that given the async nature of node, the only time this stack is in
   * a reliable state is in the user callback of a single isolated query set,
   * and the stack should be cleared prior to the set.
   */
  var query_stack = [];
  var get_query_stack = function() { return query_stack; }
  var clear_query_stack = function() { query_stack = []; }

  return {
    defaults: defaults,
    connect: connect,
    disconnect: disconnect,
    query_object: query_object,
    execute_query: execute_query,
    //
    // To customize the transactional commands, these keys would be included.
    // transaction_begin: transaction_begin,
    // transaction_commit: transaction_commit,
    // transaction_rollback: transaction_rollback,
    //
    // Custom methods for the dummy driver.
    get_query_stack: get_query_stack,
    clear_query_stack: clear_query_stack,
  }
}

