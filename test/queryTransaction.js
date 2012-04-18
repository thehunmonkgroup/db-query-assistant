var util = require('./util');
var should = require('should');

// For all tests, the dummy driver spits back the passed queries as the result
// data, so testing that the result matches the query will confirm that the
// result data is from the correct query.
describe('Database', function() {
  describe('#queryTransaction()', function() {
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
        db.queryTransaction(query, cb);
      });
      it('should return query data to the callback', function(done) {
        var query = util.query_string;
        var query_data = query();
        var cb = function(err, data) {
          data.query.should.equal(query_data);
          done();
        }
        db.queryTransaction(query, cb);
      });
    });
    describe('with one successful query (object)', function() {
      it('should not return an error object', function(done) {
        var query = util.query_object;
        var cb = function(err, data) {
          should.not.exist(err);
          done();
        }
        db.queryTransaction(query, cb);
      });
      it('should return query data to the callback', function(done) {
        var query = util.query_object;
        var query_data = "object";
        var cb = function(err, data) {
          data.query.should.equal(query_data);
          done();
        }
        db.queryTransaction(query, cb);
      });
    });
    describe('with one failed query', function() {
      it('should return an error object', function(done) {
        var query = util.query_error;
        var error_data = 'ERROR';
        var cb = function(err, data) {
          err.should.equal(error_data);
          done();
        }
        db.queryTransaction(query, cb);
      });
      it('should not return a data object', function(done) {
        var query = util.query_error;
        var cb = function(err, data) {
          should.not.exist(data);
          done();
        }
        db.queryTransaction(query, cb);
      });
    });
    describe('with one query returning false', function() {
      it('should not return an error object', function(done) {
        var query = util.query_false;
        var cb = function(err, data) {
          should.not.exist(err);
          done();
        }
        db.queryTransaction(query, cb);
      });
      it('should return data as false', function(done) {
        var query = util.query_false;
        var cb = function(err, data) {
          data.should.be.false;
          done();
        }
        db.queryTransaction(query, cb);
      });
    });
    describe('with two queries (both succeed)', function() {
      it('should not return an error object', function(done) {
        var query1 = util.query_string;
        var query2 = function(data1, query) {
          util.query_object(query);
        }
        var cb = function(err, data2) {
          should.not.exist(err);
          done();
        }
        db.queryTransaction(query1, query2, cb);
      });
      it('should return query1 data as the second argument to query2', function(done) {
        var query1 = util.query_string;
        var query2 = function(data1) {
          data1.query.should.equal(query1_data);
          return util.query_array();
        }
        var query1_data = query1();
        var cb = function(err, data2) {
          done();
        }
        db.queryTransaction(query1, query2, cb);
      });
      it('should return query2 data as the second argument to user callback', function(done) {
        var query1 = util.query_array;
        var query2 = function(data1) {
          return util.query_string();
        }
        var query2_data = util.query_string();
        var cb = function(err, data2) {
          data2.query.should.equal(query2_data);
          done();
        }
        db.queryTransaction(query1, query2, cb);
      });
    });
    describe('with two queries (first fails)', function() {
      it('should return an error object', function(done) {
        var query1 = util.query_error;
        var query2 = function(data1) {
          return util.query_string();
        }
        var error_data = 'ERROR';
        var cb = function(err, data2) {
          err.should.equal(error_data);
          done();
        }
        db.queryTransaction(query1, query2, cb);
      });
      it('should not return a data object to query2', function(done) {
        var query1 = util.query_error;
        var query2 = function(data1) {
          should.not.exist(data1);
          return util.query_string();
        }
        var cb = function(err, data2) {
          done();
        }
        db.queryTransaction(query1, query2, cb);
      });
      it('should not return a data object to the user callback', function(done) {
        var query1 = util.query_error;
        var query2 = function(data1) {
          return util.query_string();
        }
        var cb = function(err, data2) {
          should.not.exist(data2);
          done();
        }
        db.queryTransaction(query1, query2, cb);
      });
    });
    describe('with two queries (second fails)', function() {
      it('should return an error object', function(done) {
        var query1 = util.query_string;
        var query2 = function(data1) {
          return util.query_error();
        }
        var error_data = 'ERROR';
        var cb = function(err, data2) {
          err.should.equal(error_data);
          done();
        }
        db.queryTransaction(query1, query2, cb);
      });
      it('should return a data object to query2', function(done) {
        var query1 = util.query_string;
        var query2 = function(data1) {
          data1.query.should.equal(query1_data);
          return util.query_error();
        }
        var query1_data = query1();
        var cb = function(err, data2) {
          done();
        }
        db.queryTransaction(query1, query2, cb);
      });
      it('should not return a data object to the user callback', function(done) {
        var query1 = util.query_string;
        var query2 = function(data1) {
          return util.query_error();
        }
        var cb = function(err, data2) {
          should.not.exist(data2);
          done();
        }
        db.queryTransaction(query1, query2, cb);
      });
    });
  });
});

