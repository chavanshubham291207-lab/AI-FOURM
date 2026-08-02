require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

// DNS resolution fallback for mongodb+srv:// SRV record lookups
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  const isProduction = process.env.NODE_ENV === 'production';

  // Fallback to localhost only in local development when MONGO_URI is absent
  const connectionString = uri || 'mongodb://127.0.0.1:27017/ai_forum';

  try {
    const conn = await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 10000
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);

    // If MONGO_URI was provided or running in production, NEVER fallback to Memory Server (prevents silent data loss)
    if (isProduction) {
      console.error('---------------------------------------------------------');
      console.error('❌ FATAL: Production MongoDB Atlas Connection Failed!');
      console.error(`Reason: ${error.message}`);
      console.error('Please check:');
      console.error('1. MONGO_URI in Render Environment Variables');
      console.error('2. Special characters in password (URL encode @ as %40, # as %23, etc.)');
      console.error('3. Atlas Network Access (Allow 0.0.0.0/0 for Render)');
      console.error('4. Atlas Database User credentials & permissions');
      console.error('---------------------------------------------------------');
      process.exit(1);
    }

    try {
      console.log('⚡ Trying local MongoDB instance at mongodb://127.0.0.1:27017/ai_forum...');
      const conn = await mongoose.connect('mongodb://127.0.0.1:27017/ai_forum', { serverSelectionTimeoutMS: 3000 });
      console.log(`✅ Connected to Local MongoDB: ${conn.connection.host}`);
      return conn;
    } catch (localErr) {
      console.log(`⚡ Initializing Mongo Memory Server for local development testing...`);
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        const memUri = mongoServer.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`✅ MongoDB Connected (Local Memory Instance): ${conn.connection.host}`);
        return conn;
      } catch (memError) {
        console.error(`❌ Fatal Database Failure: ${memError.message}`);
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
