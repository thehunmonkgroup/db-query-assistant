var _ = require('underscore');
var db_pool = require('../../db-query-assistant');
var config = require('./config.dummy');

var get_default_driver = function() {
  var db = db_pool.create('dummy');
  return db;
}

var get_driver = function() {
  var db = db_pool.create('dummy', config.db, config.db_pool);
  return db;
}

describe('#create()', function() {
  describe('with no database and pool arguments', function() {
    it('should return pool with a pool object', function() {
      get_default_driver().pool.should.be.a('object');
    });
    it('should return pool with a driver object', function() {
      get_default_driver().driver.should.be.a('object');
    });
    it('should return pool with a query function', function() {
      get_default_driver().query.should.be.a('function');
    });
    it('should return pool with a querySeries function', function() {
      get_default_driver().querySeries.should.be.a('function');
    });
    it('should return pool with a queryTransaction function', function() {
      get_default_driver().queryTransaction.should.be.a('function');
    });
  });
  describe('with database and pool arguments', function() {
    it('should return pool with a pool object', function() {
      get_driver().pool.should.be.a('object');
    });
    it('should return pool with a driver object', function() {
      get_driver().driver.should.be.a('object');
    });
    it('should return pool with a query function', function() {
      get_driver().query.should.be.a('function');
    });
    it('should return pool with a querySeries function', function() {
      get_driver().querySeries.should.be.a('function');
    });
    it('should return pool with a queryTransaction function', function() {
      get_driver().queryTransaction.should.be.a('function');
    });
  });
});

