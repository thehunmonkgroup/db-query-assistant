# node-db-query-assistant

## Summary

Provides the following features on top of [node-db](http://nodejsdb.org) drivers:

 * Configurable connection pooling.
 * Issue multiple simultaneous queries, and get all results back in one callback when the last query completes.
 * Issue queries in series, getting the results for each previous query back before executing the next one.

At this point it only supports the db-mysql driver, as I haven't abstracted the code to make the other drivers pluggable. Would be a simple thing to do though, feel free to submit a pull request!

It's also possible that this could be abstracted further to provide functionality across different node-based database drivers.

## Installation

### Dependencies
 * [underscore](http://documentcloud.github.com/underscore)
 * [async](https://github.com/caolan/async)
 * [node-pool](https://github.com/coopernurse/node-pool)
 * [db-mysql](https://github.com/mariano/node-db-mysql)

No npm package yet, when the API is fully hardened it will be packaged. For now, clone it!

## Usage
```javascript
  var assistant = require('node-db-query-assistant');
  assistant.debug(true);

  // Any values for creating a new node-db Database object can be passed.
  var db_config = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'test',
  };
  // Any values for creating a new node-pool Pool object can be passed.
  var pool_config = {
    max: 10,
  };

  var db = assistant.create(db_config, pool_config);

  /**
   * Single query example.
   *
   * Query functions are passed the following arguments:
   *   query:
   *     A node-db query object that can be used to construct the query to
   *     execute. When using the query object, do not return a value from the
   *     query function!
   *   db:
   *     The node-db database object.
   */
  var query = function(query, db) {
    query.select('*').from('test_table').limit(1);
    console.log("connected? " + db.isConnected());
  }
  var callback = function(err, data) {
    console.log(err);
    console.log(data.rows);
    console.log(data.columns);
  }
  db.query(query, callback);

  /**
   * Muliple simultaneous queries example.
   *
   * The query object doesn't have to be used.  Any of the following forms can
   * be returned by the query function.
   *
   * Query results will be returned to the callback function in the order the
   * queries are passed to the assistant, one data argument per query.
   *
   * To skip executing a query, return false from the query function, the data
   * result for the skipped query in the callback will also be set to false.
   */
  var query_string = function() {
    return "SELECT * FROM test_table WHERE id = 1 LIMIT 1";
  }
  var query_array_string = function() {
    return ["SELECT * FROM test_table WHERE id = 2 LIMIT 1"];
  }
  var skipped_query = function() {
    return false;
  }
  var query_array_string_value = function() {
    return ["SELECT * FROM test_table WHERE id = ? LIMIT 1", 3];
  }
  var callback2 = function(err, data1, data2, skipped_data, data3) {
    console.log(err);
    console.log(data1.rows);
    console.log(data2.rows);
    console.log(skipped_data == false);
    console.log(data3.rows);
  }
  db.query(query_string, query_array_string, skipped_query, query_array_string_value, callback2);

  /**
   * Query series example.
   *
   * The result data from the previous query function (if there was one) will be
   * the first argument to the next query function.
   */
  var query_count = function() {
    return "SELECT COUNT(id) AS count FROM test_table";
  }
  var query_after_count = function(count_data, query, db) {
    console.log(count_data);
    query.select('*').from('another_table').limit(count_data.rows[0].count);
  }
  var callback3 = function(err, data) {
    console.log(data);
  }
  db.querySeries(query_count, query_after_count, callback3);
```
