const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  let testThreadId;
  let testReplyId;

  suite('API ROUTING FOR /api/threads/:board', function() {

    test('POST a new thread', function(done) {
      chai.request(server)
        .post('/api/threads/test')
        .send({
          text: 'Test thread text',
          delete_password: 'pass123'
        })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          done();
        });
    });

    test('GET threads', function(done) {
      chai.request(server)
        .get('/api/threads/test')
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.isAtMost(res.body.length, 10);
          assert.property(res.body[0], '_id');
          testThreadId = res.body[0]._id;
          done();
        });
    });

    test('PUT report a thread', function(done) {
      chai.request(server)
        .put('/api/threads/test')
        .send({
          thread_id: testThreadId
        })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'reported');
          done();
        });
    });

    test('DELETE a thread with incorrect pwd', function(done) {
      chai.request(server)
        .delete('/api/threads/test')
        .send({
          thread_id: testThreadId,
          delete_password: 'wrongpass'
        })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'incorrect password');
          done();
        });
    });

    test('DELETE a thread with correct pwd', function(done) {
      chai.request(server)
        .delete('/api/threads/test')
        .send({
          thread_id: testThreadId,
          delete_password: 'pass123'
        })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        });
    });

  });

  suite('API ROUTING FOR /api/replies/:board', function() {

    // Primero creamos un thread nuevo para usarlo
    test('POST a new thread for replies test', function(done) {
      chai.request(server)
        .post('/api/threads/test')
        .send({
          text: 'Thread for replies',
          delete_password: 'pass123'
        })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          done();
        });
    });

    test('GET thread to get ID', function(done) {
      chai.request(server)
        .get('/api/threads/test')
        .end(function(err, res) {
          assert.equal(res.status, 200);
          testThreadId = res.body[0]._id;
          done();
        });
    });

    test('POST a reply', function(done) {
      chai.request(server)
        .post('/api/replies/test')
        .send({
          thread_id: testThreadId,
          text: 'Test reply',
          delete_password: 'pass123'
        })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          done();
        });
    });

    test('GET replies', function(done) {
      chai.request(server)
        .get('/api/replies/test')
        .query({ thread_id: testThreadId })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.property(res.body, '_id');
          assert.property(res.body.replies[0], '_id');
          testReplyId = res.body.replies[0]._id;
          done();
        });
    });

    test('PUT report reply', function(done) {
      chai.request(server)
        .put('/api/replies/test')
        .send({
          thread_id: testThreadId,
          reply_id: testReplyId
        })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'reported');
          done();
        });
    });

    test('DELETE reply with wrong password', function(done) {
      chai.request(server)
        .delete('/api/replies/test')
        .send({
          thread_id: testThreadId,
          reply_id: testReplyId,
          delete_password: 'wrong'
        })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'incorrect password');
          done();
        });
    });

    test('DELETE reply with correct password', function(done) {
      chai.request(server)
        .delete('/api/replies/test')
        .send({
          thread_id: testThreadId,
          reply_id: testReplyId,
          delete_password: 'pass123'
        })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        });
    });

  });

});
