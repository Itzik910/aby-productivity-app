const mongoose = require('mongoose');
require('dotenv').config();

console.log('Testing MongoDB connection...');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aby-productivity', {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Successfully connected to MongoDB!');
  console.log('Database:', mongoose.connection.name);
  console.log('Host:', mongoose.connection.host);
  console.log('Port:', mongoose.connection.port);
  process.exit(0);
})
.catch(err => {
  console.error('❌ Failed to connect to MongoDB:', err.message);
  console.log('\n💡 Troubleshooting tips:');
  console.log('1. If using MongoDB Atlas:');
  console.log('   - Check if your IP is whitelisted');
  console.log('   - Verify your connection string');
  console.log('   - Check username/password');
  console.log('2. If using local MongoDB:');
  console.log('   - Make sure MongoDB is running');
  console.log('   - Try: mongod --dbpath /path/to/data/db');
  console.log('3. Check your .env file for MONGODB_URI');
  process.exit(1);
}); 