var generic_pool = require('generic-pool');
var async = require('async');
var _ = require('underscore');
var debug = false;

/**
 * Creates a pool of database connections.
 *
 * @param db_settings
 *   A hash of settings to pass to node-db. Any parameters accepted by the
 *   Database class are allowed.
 * @param pool_settings
 *   A hash of settings to pass to generic-pool. Any parameters accepted by the
 *   Pool class are allowed, except the create and destroy functions, which are
 *   managed internally.
 *
 * @return
 *   The configured connection pool.
 */
var create_pool = function(driver_name, driver, db_settings, pool_settings) {

  // Defaults.
  var db_defaults = {
    hostname: 'localhost',
    database: 'test',
    user: 'root',
  };
  _.defaults(db_settings, db_defaults);
  var pool_defaults = {
    name: driver_name,
    max: 10,
  };
  _.defaults(pool_settings, pool_defaults);

  // Create and destroy are configured internally.
  pool_settings.create = function(query_callback) {
    driver.connect(db_settings, query_callback);
    if (debug) {
      debug_log("New connection created");
    }
  }
  pool_settings.destroy = function(db) {
    driver.disconnect(db);
    if (debug) {
      debug_log("Connection destroyed");
    }
  }
  return generic_pool.Pool(pool_settings);
}

/**
 * Sets up query/pool methods for a pool.
 *
 * @param pool
 *   A pool object as returned by create_pool().
 *
 * @return
 *   An object with the query pool and query methods.
 *
 * @see create_pool()
 */
var query_pool = function(driver, pool) {

  /**
   * Processes multiple queries.
   */
  var execute_queries = function() {
    var args = _.toArray(arguments);

    // User-provided callback.
    var callback = args.pop();

    // Look for any data to be passed to the query callback.
    if (!_.isFunction(_.last(args))) {
      var callback_data = args.pop();
    }

    /**
     * Called after all queries complete.
     *
     * @param results
     *   An array of result objects.
     */
    var return_results = function(err, results) {
      if (debug) {
        debug_log("All queries complete, executing callback");
      }
      if (_.isArray(results)) {
        results.unshift(err);
      }
      else {
        results = err
      }
      callback.apply(null, results);
    }

    /**
     * Called for each query to be executed.
     *
     * @param query_func
     *   The user-provided query function.
     * @param async_callback
     *   The internal async callback function.
     */
    var single_query = function(query_func, async_callback) {

      /**
       * Called after a resource has been acquired from the pool.
       *
       * @param db
       *   The database object.
       */
      var pool_acquired = function(err, db) {
        if (debug) {
          debug_log("Resource acquired");
        }
        if (err) {
          if (debug) {
            debug_log("Database error!");
            debug_log(err);
          }
          async_callback(err);
          return;
        }

        /**
         * Called when the query is finished.
         *
         * @param rows
         *   An array of result objects.
         * @columns
         *   An object describing the table columns of the query.
         */
        var execute_callback = function(err, result) {
          pool.release(db);
          if (debug) {
            debug_log("Resource released");
          }
          if (err) {
            if (debug) {
              debug_log("Query error!");
              debug_log(err);
            }
            async_callback(err);
            return;
          }
          async_callback(null, result);
        }

        var query_func_args = [db];

        // The query function is given a query object, which it can use to
        // build the final query.
        if (!_.isUndefined(driver.query_object)) {
          var query = driver.query_object(db);
          query_func_args.unshift(query);
        }
        // Passed data is the first arg, because the others can be optional.
        if (!_.isUndefined(callback_data)) {
          query_func_args.unshift(callback_data);
        }
        var custom = query_func.apply(null, query_func_args);

        // Returning false allows bypassing the query, pass the false along to
        // the callback.
        if (custom === false) {
          async_callback(null, false);
        }
        else {
          if (_.isUndefined(query)) {
            driver.execute_query(db, custom, execute_callback);
          }
          else {
            driver.execute_query(db, query, custom, execute_callback);
          }
        }
      }
      pool.acquire(pool_acquired);
    }
    async.map(args, single_query, return_results);
  }

  /**
   * Executes passed queries in series, providing each subsequent query with
   * the previous query's results.
   */
  var execute_query_series = function() {
    var query_args = _.toArray(arguments);

    // User-provided callback.
    var callback = query_args.pop();

    /**
     * Builds the waterfall function that executes an individual query.
     *
     * @param query_func
     *   A user-provided query function.
     *
     * @return
     *   The query function wrapped in an async waterfall function.
     */
    var waterfall_generator = function(query_func) {
      return function() {
        var args = _.toArray(arguments);
        // The function to continue the waterfall is always the last argument.
        var waterfall_callback = args.pop();
        // Results from the last query, if any.
        var last_results = args.pop();
        // Executed to collect query results, this will always be just one
        // result set since only one query is being run at a time.
        var execute_queries_callback = function(err, data) {
          // Calls the next query in the waterfall.
          waterfall_callback.call(null, err, data);
        }
        // Run one query, passing in the data array from previous queries.
        execute_queries(query_func, last_results, execute_queries_callback);
      }
    }

    /**
     * Passes the results from the last query in the waterfall to the original
     * result callback provided by the user.
     *
     * @param data
     *   The data result object.
     */
    var waterfall_result_callback = function(err, data) {
      callback.call(null, err, data);
    }
    // Transform each individual query into a member of the waterfall.
    var waterfall_functions = _.map(query_args, waterfall_generator);
    async.waterfall(waterfall_functions, waterfall_result_callback)
  }

  return {
    pool: pool,
    query: execute_queries,
    querySeries: execute_query_series,
  };
}

/**
 * Simple debug logging wrapper.
 *
 * @param message
 *   String of the message to output.
 */
var debug_log = function(message) {
  console.log(message);
}

/**
 * API function for creating new query pools.
 *
 * @see create_pool()
 */
var create = function(driver_name, db_settings, pool_settings) {

  // Load driver.
  driver = require('./driver/' + driver_name)(debug_log, debug);

  db_settings = _.isUndefined(db_settings) ? {} : db_settings;
  pool_settings = _.isUndefined(pool_settings) ? {} : pool_settings;
  var pool = create_pool(driver_name, driver, db_settings, pool_settings);
  if (debug) {
    debug_log("New query pool created");
  }
  return query_pool(driver, pool);
}

/**
 * API function for enabling/disabling debugging.
 */
var set_debug = function(value) {
  debug = value == true ? true : false;
}

exports.create = create;
exports.debug = set_debug;

