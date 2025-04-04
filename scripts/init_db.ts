// scripts/init_db.ts - Initialize database schema
import * as db from "../db/db_pool.ts";
import { config } from "../config.ts";

const SQL_CREATE_TABLES = `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  guid TEXT NOT NULL,
  email TEXT NOT NULL,
  task JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ext_users table
CREATE TABLE IF NOT EXISTS ext_users (
  id SERIAL PRIMARY KEY,
  guid TEXT NOT NULL,
  email TEXT NOT NULL,
  task JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  owner TEXT NOT NULL,
  email TEXT NOT NULL,
  task JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_auth table
CREATE TABLE IF NOT EXISTS user_auth (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS ext_users_email_idx ON ext_users(email);
CREATE INDEX IF NOT EXISTS contacts_owner_idx ON contacts(owner);
CREATE INDEX IF NOT EXISTS users_guid_idx ON users(guid);
CREATE INDEX IF NOT EXISTS ext_users_guid_idx ON ext_users(guid);
`;

async function initializeDatabase() {
  console.log("Initializing database...");
  
  try {
    // Initialize database connection pool
    await db.initPool();
    
    // Execute SQL to create tables
    await db.query(SQL_CREATE_TABLES);
    
    console.log("Database schema initialized successfully");
    
    // Insert a sample user if user_auth is empty
    const userResult = await db.query(
      "SELECT COUNT(*) as count FROM user_auth"
    );
    
    if (userResult.rows[0].count === 0) {
      console.log("Adding sample user 'admin' with password 'password'");
      
      // In a production system, use a proper password hashing library
      // This is a simplified example
      const hashedPassword = await hashPassword("password");
      
      await db.query(
        "INSERT INTO user_auth (username, password_hash) VALUES ($1, $2)",
        ["admin", hashedPassword]
      );
      
      // Add a sample contact for the admin user
      const sampleContactTask = {
        task: {
          data: {
            name: "Sample Contact",
            avatar: "avatar_placeholder.png",
            email: "sample@example.com"
          }
        }
      };
      
      await db.query(
        "INSERT INTO contacts (owner, email, task) VALUES ($1, $2, $3)",
        ["admin", "sample@example.com", JSON.stringify(sampleContactTask)]
      );
      
      console.log("Sample user and contact added");
    }
    
  } catch (error) {
    console.error("Error initializing database:", error);
  } finally {
    // Close the database pool
    await db.closePool();
  }
}

// Simple password hashing function
// In production, use a proper password hashing library
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Run the initialization if script is executed directly
if (import.meta.main) {
  await initializeDatabase();
}
