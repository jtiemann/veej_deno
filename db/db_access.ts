// db/db_access.ts - Database access functions
import * as db from "./db_pool.ts";

/**
 * Insert a message into the users table
 */
export async function insertMessageIntoUsers(guid: string, email: string, task: string): Promise<boolean> {
  try {
    const sql = "INSERT INTO users (guid, email, task) VALUES ($1, $2, $3)";
    await db.query(sql, [guid, email, task]);
    return true;
  } catch (err) {
    console.error("Error inserting into users:", err);
    return false;
  }
}

/**
 * Insert a message into the ext_users table
 */
export async function insertMessageIntoExtUsers(guid: string, email: string, task: string): Promise<boolean> {
  try {
    const sql = "INSERT INTO ext_users (guid, email, task) VALUES ($1, $2, $3)";
    await db.query(sql, [guid, email, task]);
    return true;
  } catch (err) {
    console.error("Error inserting into ext_users:", err);
    return false;
  }
}

/**
 * Get contacts for a user
 */
export async function getContacts(user: string): Promise<any[]> {
  try {
    const sql = "SELECT email, task FROM contacts WHERE owner LIKE $1 AND email IS NOT NULL AND task IS NOT NULL ORDER BY email ASC";
    const result = await db.query(sql, [`%${user}%`]);
    return result.rows;
  } catch (err) {
    console.error("Error getting contacts:", err);
    return [];
  }
}

/**
 * Get messages between a user and a recipient
 */
export async function getMessages(user: string, recipient: string): Promise<any[]> {
  try {
    const userPattern = `%${user}%`;
    const recipientPattern = `%${recipient}%`;
    
    const sql = `
      SELECT email, task FROM ext_users 
      WHERE 
        (email LIKE $1 AND task->'task'->'data'->>'respondTo' LIKE $2)
        OR (email LIKE $3 AND task->'task'->'data'->>'respondTo' LIKE $4)
      ORDER BY task->'task'->'data'->>'when' DESC 
      LIMIT 200
    `;
    
    const result = await db.query(sql, [
      userPattern, recipientPattern, recipientPattern, userPattern
    ]);
    
    return result.rows;
  } catch (err) {
    console.error("Error getting messages:", err);
    return [];
  }
}

/**
 * Get all messages for a user since a specific time
 */
export async function getAllMessages(user: string, since: string = "1970-01-01T00:00:00.000Z"): Promise<any[]> {
  try {
    const userPattern = `%${user}%`;
    
    const sql = `
      SELECT email, task FROM ext_users 
      WHERE 
        (email LIKE $1 OR task->'task'->'data'->>'respondTo' LIKE $2)
        AND task->'task'->'data'->>'when' > $3
      ORDER BY task->'task'->'data'->>'when' DESC 
      LIMIT 200
    `;
    
    const result = await db.query(sql, [userPattern, userPattern, since]);
    return result.rows;
  } catch (err) {
    console.error("Error getting all messages:", err);
    return [];
  }
}

/**
 * Initialize the database tables if they don't exist
 */
export async function initDatabase(): Promise<void> {
  try {
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        guid TEXT NOT NULL,
        email TEXT NOT NULL,
        task JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create ext_users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS ext_users (
        id SERIAL PRIMARY KEY,
        guid TEXT NOT NULL,
        email TEXT NOT NULL,
        task JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create contacts table
    await db.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        owner TEXT NOT NULL,
        email TEXT NOT NULL,
        task JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await db.query("CREATE INDEX IF NOT EXISTS users_email_idx ON users (email)");
    await db.query("CREATE INDEX IF NOT EXISTS ext_users_email_idx ON ext_users (email)");
    await db.query("CREATE INDEX IF NOT EXISTS contacts_owner_idx ON contacts (owner)");
    
    console.log("Database tables initialized");
  } catch (err) {
    console.error("Error initializing database tables:", err);
    throw err;
  }
}
