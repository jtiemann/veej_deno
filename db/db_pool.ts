// db/db_pool.ts - Enhanced database connection pool

import { Pool, PoolClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { config } from "../config.ts";

// Create a connection pool
let pool: Pool;
let isPoolInitialized = false;
let reconnectTimeout: number | null = null;

/**
 * Initialize the database connection pool with retry mechanism
 */
export async function initPool(retries = 5, delay = 5000): Promise<void> {
  if (isPoolInitialized) {
    console.log("Database pool already initialized");
    return;
  }

  const dbConfig = config.database;
  
  try {
    console.log(`Connecting to database at ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    
    pool = new Pool({
      hostname: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      tls: config.useTls ? { enabled: true } : undefined,
    }, dbConfig.poolSize);
    
    // Test the connection
    const client = await pool.connect();
    const result = await client.queryArray("SELECT 1");
    client.release();
    
    console.log("Database connection successful");
    isPoolInitialized = true;
    
    // Set up connection health check
    setupConnectionHealthCheck();
  } catch (err) {
    console.error("Error connecting to database:", err);
    
    if (retries > 0) {
      console.log(`Retrying database connection in ${delay/1000} seconds (${retries} attempts left)...`);
      setTimeout(() => initPool(retries - 1, delay), delay);
    } else {
      throw new Error("Failed to connect to database after multiple attempts");
    }
  }
}

/**
 * Set up a periodic health check for the database connection
 */
function setupConnectionHealthCheck() {
  const interval = setInterval(async () => {
    try {
      const client = await pool.connect();
      const result = await client.queryArray("SELECT 1");
      client.release();
      console.log("Database connection health check: OK");
    } catch (err) {
      console.error("Database connection health check failed:", err);
      
      // Try to reinitialize the pool
      isPoolInitialized = false;
      clearInterval(interval);
      
      if (!reconnectTimeout) {
        reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null;
          initPool();
        }, 5000);
      }
    }
  }, 30000); // Check every 30 seconds
}

/**
 * Execute a query with parameters and improved error handling
 */
export async function query(text: string, params: any[] = []): Promise<any> {
  if (!isPoolInitialized) {
    throw new Error("Database pool not initialized");
  }

  let client: PoolClient | null = null;
  let retries = 3;
  
  while (retries > 0) {
    try {
      client = await pool.connect();
      const result = await client.queryObject(text, params);
      return result;
    } catch (err) {
      console.error(`Error executing query (${retries} retries left):`, err);
      retries--;
      
      if (retries === 0) {
        throw err;
      }
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}

/**
 * Execute a transaction with multiple queries and improved error handling
 */
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  if (!isPoolInitialized) {
    throw new Error("Database pool not initialized");
  }

  const client = await pool.connect();
  try {
    await client.queryArray("BEGIN");
    const result = await callback(client);
    await client.queryArray("COMMIT");
    return result;
  } catch (e) {
    console.error("Transaction error, rolling back:", e);
    await client.queryArray("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Close the pool and all connections
 */
export async function closePool(): Promise<void> {
  if (isPoolInitialized && pool) {
    await pool.end();
    isPoolInitialized = false;
    console.log("Database pool closed");
  }
}
