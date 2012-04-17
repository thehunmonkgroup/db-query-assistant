var util = require('./util');

describe('Database pool', function() {
  describe('#create()', function() {
    describe('with no database and pool arguments', function() {
      it('should return an object with a pool object', function() {
        util.get_default_driver().pool.should.be.a('object');
      });
      it('should return an object with a driver object', function() {
        util.get_default_driver().driver.should.be.a('object');
      });
      it('should return an object with a query function', function() {
        util.get_default_driver().query.should.be.a('function');
      });
      it('should return an object with a querySeries function', function() {
        util.get_default_driver().querySeries.should.be.a('function');
      });
      it('should return an object with a queryTransaction function', function() {
        util.get_default_driver().queryTransaction.should.be.a('function');
      });
    });
    describe('with database and pool arguments', function() {
      it('should return an object with a pool object', function() {
        util.get_driver().pool.should.be.a('object');
      });
      it('should return an object with a driver object', function() {
        util.get_driver().driver.should.be.a('object');
      });
      it('should return an object with a query function', function() {
        util.get_driver().query.should.be.a('function');
      });
      it('should return an object with a querySeries function', function() {
        util.get_driver().querySeries.should.be.a('function');
      });
      it('should return an object with a queryTransaction function', function() {
        util.get_driver().queryTransaction.should.be.a('function');
      });
    });
  });
});

