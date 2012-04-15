var _ = require('underscore');
var db_pool = require('../../db-query-assistant');

var valid_pool_object = function(db) {
  return _.isObject(db) && _.isObject(db.pool) && _.isFunction(db.query) && _.isFunction(db.querySeries) && _.isFunction(db.queryTransaction);
}

describe('#create()', function(){
  describe('with no database and pool arguments', function(){
    it('should return a valid pool object', function() {
      var db = db_pool.create('dummy');
      var valid_object = valid_pool_object(db);
      valid_object.should.be.true;
    });
  });
  describe('with database and pool arguments', function(){
    it('should return a valid pool object', function() {
      var config = require('./config.dummy');
      var db = db_pool.create('dummy', config.db, config.db_pool);
      var valid_object = valid_pool_object(db);
      valid_object.should.be.true;
    });
  });
});
