require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_forum';

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed for Atlas URI (${error.message}).`);
    console.log(`⚡ Initializing Mongo Memory Server for zero-config localhost execution...`);

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
};

module.exports = connectDB;
