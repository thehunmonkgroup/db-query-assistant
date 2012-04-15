var db_pool = require('../../db-query-assistant');

describe('create', function(){
  describe('no database and pool arguments', function(){
    it('should create a pool object with the default arguments', function() {
      var db = db_pool.create('dummy');
      db.should.be.a('object');
    });
  })
});
