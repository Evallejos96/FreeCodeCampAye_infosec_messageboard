'use strict';

const { MongoClient, ObjectId } = require('mongodb');

const CONNECTION_STRING = process.env.DB;

module.exports = function (app) {

  const client = new MongoClient(CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  async function getDb() {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
    }
    return client.db();
  }

  // ---------------- THREADS ------------------

  app.route('/api/threads/:board')

    // CREATE THREAD
    .post(async (req, res) => {
      const db = await getDb();
      const board = req.params.board;
      const { text, delete_password } = req.body;

      const thread = {
        board,
        text,
        delete_password,
        created_on: new Date(),
        bumped_on: new Date(),
        reported: false,
        replies: []
      };

      await db.collection('threads').insertOne(thread);

      return res.redirect(`/b/${board}/`);
    })

    // GET THREADS
    .get(async (req, res) => {
      const db = await getDb();
      const board = req.params.board;

      const threads = await db.collection('threads')
        .find({ board })
        .sort({ bumped_on: -1 })
        .limit(10)
        .toArray();

      const sanitized = threads.map(t => ({
        _id: t._id,
        text: t.text,
        created_on: t.created_on,
        bumped_on: t.bumped_on,
        replies: t.replies
          .slice(-3)
          .map(r => ({
            _id: r._id,
            text: r.text,
            created_on: r.created_on
          })),
        replycount: t.replies.length
      }));

      return res.json(sanitized);
    })

    // DELETE THREAD
    .delete(async (req, res) => {
      const db = await getDb();
      const { thread_id, delete_password } = req.body;

      const thread = await db.collection('threads').findOne({
        _id: new ObjectId(thread_id)
      });

      if (!thread) return res.send('incorrect password');
      if (thread.delete_password !== delete_password)
        return res.send('incorrect password');

      await db.collection('threads').deleteOne({
        _id: new ObjectId(thread_id)
      });

      return res.send('success');
    })

    // REPORT THREAD
    .put(async (req, res) => {
      const db = await getDb();
      const { thread_id } = req.body;

      await db.collection('threads').updateOne(
        { _id: new ObjectId(thread_id) },
        { $set: { reported: true } }
      );

      return res.send('reported');
    });

  // ---------------- REPLIES ------------------

  app.route('/api/replies/:board')

    // CREATE REPLY
    .post(async (req, res) => {
      const db = await getDb();
      const board = req.params.board;
      const { text, delete_password, thread_id } = req.body;

      const reply = {
        _id: new ObjectId(),
        text,
        delete_password,
        created_on: new Date(),
        reported: false
      };

      await db.collection('threads').updateOne(
        { _id: new ObjectId(thread_id) },
        {
          $push: { replies: reply },
          $set: { bumped_on: reply.created_on }
        }
      );

      return res.redirect(`/b/${board}/${thread_id}`);
    })

    // GET REPLIES
    .get(async (req, res) => {
      const db = await getDb();
      const thread_id = req.query.thread_id;

      const thread = await db.collection('threads').findOne({
        _id: new ObjectId(thread_id)
      });

      if (!thread) return res.json({ error: 'not found' });

      const sanitized = {
        _id: thread._id,
        text: thread.text,
        created_on: thread.created_on,
        bumped_on: thread.bumped_on,
        replies: thread.replies.map(r => ({
          _id: r._id,
          text: r.text,
          created_on: r.created_on
        }))
      };

      return res.json(sanitized);
    })

    // DELETE REPLY
    .delete(async (req, res) => {
      const db = await getDb();
      const { thread_id, reply_id, delete_password } = req.body;

      const thread = await db.collection('threads').findOne({
        _id: new ObjectId(thread_id)
      });

      if (!thread) return res.send('incorrect password');

      const reply = thread.replies.find(r => String(r._id) === reply_id);
      if (!reply) return res.send('incorrect password');

      if (reply.delete_password !== delete_password)
        return res.send('incorrect password');

      await db.collection('threads').updateOne(
        {
          _id: new ObjectId(thread_id),
          "replies._id": new ObjectId(reply_id)
        },
        { $set: { "replies.$.text": "[deleted]" } }
      );

      return res.send('success');
    })

    // REPORT REPLY
    .put(async (req, res) => {
      const db = await getDb();
      const { thread_id, reply_id } = req.body;

      await db.collection('threads').updateOne(
        {
          _id: new ObjectId(thread_id),
          "replies._id": new ObjectId(reply_id)
        },
        { $set: { "replies.$.reported": true } }
      );

      return res.send('reported');
    });

};
