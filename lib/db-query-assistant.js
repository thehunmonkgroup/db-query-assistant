var generic_pool = require('generic-pool');
var async = require('async');
var _ = require('underscore');
var debug = false;

// If a driver does not provide transactional query functions, these will be
// used as the defaults.
var default_transaction_begin = function() { return "BEGIN"; }
var default_transaction_commit = function() { return "COMMIT"; }
var default_transaction_rollback = function() { return "ROLLBACK"; }

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
  var db_defaults = driver.defaults ? driver.defaults : {};
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

  var transaction_begin = driver.transaction_begin || default_transaction_begin;
  var transaction_commit = driver.transaction_commit || default_transaction_commit;
  var transaction_rollback = driver.transaction_rollback || default_transaction_rollback;

  /**
   * Helper function to log the result of acquiring a resource from the pool.
   */
  var log_resource_acquired = function(err) {
    if (err) {
      if (debug) {
        debug_log("Database error!");
        debug_log(err);
      }
    }
    else {
      if (debug) {
        debug_log("Resource acquired");
      }
    }
  }

  /**
   * Processes multiple queries.
   */
  var execute_queries = function() {
    var args = _.toArray(arguments);

    var config = args.pop();

    // User-provided callback.
    var callback = config.callback

    // Data to be passed to the query callback.
    var callback_data = config.data;

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
        log_resource_acquired(err);
        if (err) {
          async_callback(err);
          return;
        }
        else {
          execute_single_query(db);
        }
      }

      /**
       * Called to execute a single query against a database connection.
       *
       * @param db
       *   The database object.
       */
      var execute_single_query = function(db) {

        /**
         * Called when the query is finished.
         *
         * @param result
         *   An object of result data. The format is driver-specific, see
         *   driver documentation for details.
         */
        var execute_callback = function(err, result) {
          // If the calling code isn't managing the database connection, then
          // release it back into the pool.
          if (!config.db) {
            pool.release(db);
            if (debug) {
              debug_log("Resource released");
            }
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
      // Use the passed database connection.
      if (config.db) {
        execute_single_query(config.db);
      }
      // Get a new connection from the pool.
      else {
        pool.acquire(pool_acquired);
      }
    }
    async.map(args, single_query, return_results);
  }

  /**
   * Simple wrapper to properly format the arguments for executing
   * multiple simultaneous queries.
   *
   * @param query_func
   *   The internal querying function to execute.
   * @param is_transaction
   *   Boolean. True if the query series should be handled as a transaction.
   */
  var execute_queries_setup = function(query_func, is_transaction) {
    return function() {
      var args = _.toArray(arguments);
      var callback = args.pop();
      var config = {
        callback: callback,
      };
      if (is_transaction) {
        config.transaction = true;
      }
      args.push(config);
      query_func.apply(this, args);
    }
  }

  /**
   * Executes passed queries in series, providing each subsequent query with
   * the previous query's results.
   */
  var execute_query_series = function() {
    var query_args = _.toArray(arguments);

    var config = query_args.pop();

    // User-provided callback.
    var callback = config.callback;

    // Track the first and last query, this allows consistent argument passing
    // for transaction and non-transaction sets.
    var first_query = _.first(query_args);
    var last_query = _.last(query_args);

    // Wrap the series in transaction queries.
    if (config.transaction) {
      query_args.unshift(transaction_begin);
      query_args.push(transaction_commit);
    }

    /**
     * Called after a resource has been acquired from the pool.
     *
     * @param db
     *   The database object.
     */
    var pool_acquired = function(err, db) {
      log_resource_acquired(err);
      if (err) {
        callback(err);
        return;
      }

      // This will store the results of the last run user query, which will be
      // passed back to the user in their callback.
      var last_results = undefined;

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
          // Results from the previous query, if any.
          var previous_results = args.pop();
          // The transaction commit query gets the data from the last user
          // query, catch that here so it can be properly passed to the user
          // callback function.
          if (query_func == transaction_commit) {
            last_results = previous_results;
          }
          // The first query run should never have any previous results.
          if (query_func == first_query) {
            previous_results = undefined;
          }
          // Executed to collect query results, this will always be just one
          // result set since only one query is being run at a time.
          var execute_queries_callback = function(err, data) {
            // Calls the next query in the waterfall.
            waterfall_callback.call(null, err, data);
          }
          // Run one query, passing in the data array from the previous query.
          var query_conf = {
            callback: execute_queries_callback,
            data: previous_results,
            db: db,
          };
          execute_queries(query_func, query_conf);
        }
      }

      /**
       * Passes the results from the last query in the waterfall to the original
       * result callback provided by the user.
       *
       * This also releases the database connection that was held for
       * performing the queries.
       *
       * @param data
       *   The data result object.
       */
      var waterfall_result_callback = function(err, data) {
        var wrapup = function(results) {
          pool.release(db);
          if (debug) {
            debug_log("Resource released");
          }
          callback.call(null, err, results);
        }
        if (err) {
          var error_callback = function() {
            wrapup(null);
          }
          var error_conf = {
            callback: error_callback,
            db: db,
          };
          execute_queries(transaction_rollback, error_conf);
        }
        else {
          if (_.isUndefined(last_results)) {
            last_results = data;
          }
          wrapup(last_results);
        }
      }
      // Transform each individual query into a member of the waterfall.
      var waterfall_functions = _.map(query_args, waterfall_generator);
      async.waterfall(waterfall_functions, waterfall_result_callback)
    }
    pool.acquire(pool_acquired);
  }

  return {
    pool: pool,
    query: execute_queries_setup(execute_queries),
    querySeries: execute_queries_setup(execute_query_series),
    queryTransaction: execute_queries_setup(execute_query_series, true),
  };
}

/**
 * Simple debug logging wrapper.
 *
 * @param message
 *   String of the message to output.
 */
var debug_log = function() {
  console.log.apply(null, arguments);
}

/**
 * API function for creating new query pools.
 *
 * @see create_pool()
 */
var create = function(driver_name, db_settings, pool_settings) {

  // Load driver.
  var driver = require('./driver/' + driver_name)(debug_log, debug);

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

