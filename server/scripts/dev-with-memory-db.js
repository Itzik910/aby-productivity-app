// Local-only dev bootstrap: spins up an in-memory MongoDB (no local Mongo
// install required) and points the real server at it, then starts index.js
// unmodified. Not part of the app's production start path.
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('aby-productivity');
  process.env.PORT = process.env.PORT || '5000';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
  process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  console.log('[dev-with-memory-db] In-memory MongoDB URI:', process.env.MONGODB_URI);
  require('../index.js');
})();
