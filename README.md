# db-query-assistant

## Summary

Provides the following features on top of supported [node.js](http://nodejs.org) database connection modules:

 * Configurable connection pooling.
 * Issue multiple simultaneous queries, and get all results back in a callback when the last query completes.
 * Issue queries in series, getting the results for each previous query back before executing the next one.
 * Transaction support with auto-rollback on query error.

Drivers exist for the following modules:

 * [db-mysql](https://github.com/mariano/node-db-mysql)
 * [db-drizzle](https://github.com/mariano/node-db-drizzle)

Writing new drivers is fairly straightforward, have a look at one of the existing drivers, and feel free to submit a pull request to add one!

## Installation
```
  npm install db-query-assistant
```

### Dependencies
 * [underscore](http://documentcloud.github.com/underscore)
 * [async](https://github.com/caolan/async)
 * [generic-pool](https://github.com/coopernurse/node-pool)
 * One or more of the supported database connection modules listed above.

## Usage
```javascript
  var assistant = require('db-query-assistant');
  assistant.debug(true);

  // Parameters for connecting to the database. These are driver specific, see
  // the driver documentation. This example is for the db-mysql/db-drizzle
  // driver.
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

  // First argument is the driver to use, see lib/driver/.
  var db = assistant.create('db-mysql', db_config, pool_config);

  /**
   * Single query example.
   *
   * Query functions are passed the following arguments:
   *   query:
   *     A query object that can be used to construct the query to execute.
   *     When using the query object, do not return a value from the query
   *     function!
   *   db:
   *     The node-db database object.
   *
   * Note that not all drivers may support query objects. If a driver does not
   * support it, then no query object argument is passed to the query function.
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
   * For efficiency, each query is run on its own database connection.
   *
   * To skip executing a query, return false from the query function, the data
   * result for the skipped query in the callback will also be set to false.
   *
   * The exact format returned is driver-specific. This example shows the
   * db-mysql/db-drizzle format.
   *
   * Note that due to the async handling of multiple queries, the query
   * execution of all queries in the case of a query failure can not be
   * guaranteed consistent. This method is best used for performing multiple
   * simultaneous SELECTs.
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
   *
   * Since queries are being run in sequence, the same database connection is
   * reused for efficiency.
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

  /**
   * Query transaction example.
   *
   * Works the same as querySeries, but wraps the query set in a transaction.
   * Any query errors trigger an automatic rollback of the transaction.
   */
  var query_insert = function() {
    return ["INSERT INTO test_table (name) VALUES (?)", 'foo'];
  }
  var query_insert_detail = function(insert_data) {
    console.log(insert_data);
    return ["INSERT INTO test_table_detail (id, value) VALUES (?, ?)", insert_data.rows.id, 'bar'];
  }
  var callback4 = function(err, data) {
    console.log(data);
  }
  db.queryTransaction(query_insert, query_insert_detail, callback4);
```

## Support
The issue tracker for this project is provided to file bug reports, feature requests, and project tasks -- support requests are not accepted via the issue tracker. For all support-related issues, including configuration, usage, and training, consider hiring a competent consultant.
