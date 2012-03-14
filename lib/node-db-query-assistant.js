var generic_pool = require('generic-pool');
var async = require('async');
var mysql = require('db-mysql');
var _ = require('underscore');
var debug = false;

var create_pool = function(db_settings, pool_settings) {
  // Defaults.
  var db_defaults = {
    hostname: 'localhost',
    database: 'test',
    user: 'root',
  };
  _.defaults(db_settings, db_defaults);
  var pool_defaults = {
    name: 'mysql',
    max: 10,
  };
  _.defaults(pool_settings, pool_defaults);

  // create and destroy are configured internally.
  pool_settings.create = function(query_callback) {
    var db = new mysql.Database(db_settings);
    var post_connect = function(err, server) {
      query_callback(err, db);
    }
    db.connect(post_connect);
    if (debug) {
      debug_log("New connection created");
    }
  }
  pool_settings.destroy = function(db) {
    db.disconnect();
    if (debug) {
      debug_log("Connection destroyed");
    }
  }
  return generic_pool.Pool(pool_settings);
}

// Sets up query/pool methods for a pool.
var query_pool = function(pool) {

  // Processes multiple queries.
  var execute_queries = function() {
    var args = _.toArray(arguments);
    var callback = args.pop();

    // Look for any data to be passed to the query callback.
    if (!_.isFunction(_.last(args))) {
      var callback_data = args.pop();
    }

    // Called after all queries complete.
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

    // Called for each query to be executed.
    var single_query = function(query_func, async_callback) {

      // Called after a resource has been acquired from the pool.
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

        // Called when the query is finished.
        var execute_callback = function(err, rows, columns) {
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
          var result = {};
          result.rows = rows;
          result.columns = columns;
          async_callback(null, result);
        }

        // The query function is given a query object, which it can use to
        // build the final query.
        var query = db.query();
        var query_func_args = [query, db];
        // Passed data is the first arg, because the others can be optional.
        if (!_.isUndefined(callback_data)) {
          query_func_args.unshift(callback_data);
        }
        var custom = query_func.apply(null, query_func_args);

        // Query built using query object.
        if (_.isUndefined(custom)) {
          if (debug) {
            debug_log("Executing query: " + query.sql());
          }
          query.execute(execute_callback);
        }
        // Returning false allows bypassing the query, pass the false along to
        // the callback.
        else if (custom === false) {
          async_callback(null, false);
        }
        // Query built with a custom query string.
        else {
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
      }
      pool.acquire(pool_acquired);
    }
    async.map(args, single_query, return_results);
  }

  // Executes passed queries in series, providing each subsequent query with
  // the previous query's results.
  var execute_query_series = function() {
    var query_args = _.toArray(arguments);
    var callback = query_args.pop();
    // Builds the waterfall function that executes an individual query.
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
    // Passes the results from the last query in the waterfall to the original
    // result callback provided by the user.
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

var debug_log = function(message) {
  console.log(message);
}

var create = function(db_settings, pool_settings) {
  db_settings = _.isUndefined(db_settings) ? {} : db_settings;
  pool_settings = _.isUndefined(pool_settings) ? {} : pool_settings;
  var pool = create_pool(db_settings, pool_settings);
  if (debug) {
    debug_log("New query pool created");
  }
  return query_pool(pool);
}

var set_debug = function(value) {
  debug = value == true ? true : false;
}

exports.create = create;
exports.debug = set_debug;

