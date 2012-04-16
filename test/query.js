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
  describe('with one successful query', function() {
    it('should not return an error object', function(done) {
      var query = util.query_string;
      var query_data = query();
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
});

