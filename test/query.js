var util = require('./util');
var should = require('should');

// For all tests, the dummy driver spits back the passed queries as the result
// data, so testing that the result matches the query will confirm that the
// result data is from the correct query.
describe('pool#query()', function() {
  var db = util.get_driver();
  beforeEach(function() {
    db.driver.clear_query_stack();
  });
  describe('with one successful query (custom)', function() {
    it('should not return an error object', function(done) {
      var query = util.query_string;
      var cb = function(err, data) {
        should.not.exist(err);
        done();
      }
      db.query(query, cb);
    });
    it('should return query data to the callback', function(done) {
      var query = util.query_string;
      var query_data = query();
      var cb = function(err, data) {
        data.query.should.equal(query_data);
        done();
      }
      db.query(query, cb);
    });
  });
  describe('with one successful query (object)', function() {
    it('should not return an error object', function(done) {
      var query = util.query_object;
      var cb = function(err, data) {
        should.not.exist(err);
        done();
      }
      db.query(query, cb);
    });
    it('should return query data to the callback', function(done) {
      var query = util.query_object;
      var query_data = "object";
      var cb = function(err, data) {
        data.query.should.equal(query_data);
        done();
      }
      db.query(query, cb);
    });
  });
  describe('with one failed query', function() {
    it('should return an error object', function(done) {
      var query = util.query_error;
      var query_data = query();
      var cb = function(err, data) {
        err.should.equal(query_data);
        done();
      }
      db.query(query, cb);
    });
    it('should not return a data object', function(done) {
      var query = util.query_error;
      var cb = function(err, data) {
        should.not.exist(data);
        done();
      }
      db.query(query, cb);
    });
  });
  describe('with one query returning false', function() {
    it('should not return an error object', function(done) {
      var query = util.query_false;
      var cb = function(err, data) {
        should.not.exist(err);
        done();
      }
      db.query(query, cb);
    });
    it('should return data as false', function(done) {
      var query = util.query_false;
      var cb = function(err, data) {
        data.should.be.false;
        done();
      }
      db.query(query, cb);
    });
  });
});

