// db/db_pool.ts - PostgreSQL connection pool manager
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { config } from "../config.ts";

// Create a connection pool
let pool: Pool;

/**
 * Initialize the database connection pool
 */
export async function initPool(): Promise<void> {
  const dbConfig = config.database;
  
  pool = new Pool({
    hostname: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    tls: config.useTls ? { enabled: true } : undefined,
  }, dbConfig.poolSize);
  
  // Test the connection
  try {
    const client = await pool.connect();
    const result = await client.queryArray("SELECT 1");
    client.release();
    
    console.log("Database connection successful");
  } catch (err) {
    console.error("Error connecting to database:", err);
    throw new Error("Failed to connect to database");
  }
}

/**
 * Execute a query with parameters
 */
export async function query(text: string, params: any[] = []): Promise<any> {
  const client = await pool.connect();
  try {
    return await client.queryObject(text, params);
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction with multiple queries
 */
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.queryArray("BEGIN");
    const result = await callback(client);
    await client.queryArray("COMMIT");
    return result;
  } catch (e) {
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
  await pool.end();
}
