import { MongoClient, Db, ServerApiVersion } from 'mongodb';
import { config } from '@/config/env';

let client: MongoClient;
let db: Db;
let hydraliteDb: Db;
let connectPromise: Promise<{ client: MongoClient; db: Db }> | null = null;

export async function connectToDatabase() {
  if (db) {
    return { client, db };
  }

  // Prevent multiple simultaneous connection attempts
  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    try {
      // Add connection pooling and timeout options
      const clientOptions = {
        maxPoolSize: 50,
        minPoolSize: 10,
        maxIdleTimeMS: 30000,
        socketTimeoutMS: 30000,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true,
        family: 4,
        // SSL/TLS options for MongoDB Atlas
        tls: true,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false,
      };

      client = new MongoClient(config.mongodb.uri, clientOptions);
      await client.connect();
      db = client.db(config.mongodb.databases.prosmart);
      hydraliteDb = client.db(config.mongodb.databases.hydralite);
      
      console.log('✅ Connected to MongoDB (prosmart_db & hydralite)');

      // Ensure indexes exist (async, don't wait for it)
      try {
        const { ensureIndexes } = await import('./db-init');
        ensureIndexes().catch(err => console.error('Failed to create indexes:', err));
      } catch (error) {
        // Indexes module may not be available in some environments
        console.warn('Could not initialize indexes:', error);
      }

      return { client, db };
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      connectPromise = null; // Reset on error to allow retry
      throw error;
    }
  })();

  return connectPromise;
}

export async function getDatabase() {
  if (!db) {
    await connectToDatabase();
  }
  return db;
}

export async function getHydraliteDatabase() {
  if (!hydraliteDb) {
    await connectToDatabase();
  }
  return hydraliteDb;
}
