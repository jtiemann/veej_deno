// scripts/check_db_schema.ts - Validate database schema

import * as db from "../db/db_pool.ts";

/**
 * Check if the database schema is correctly set up
 */
export async function checkDatabaseSchema(): Promise<boolean> {
  try {
    await db.initPool();
    
    // Check if tables exist
    const tables = ["users", "ext_users", "contacts", "user_auth"];
    let allTablesExist = true;
    
    for (const table of tables) {
      const query = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `;
      
      const result = await db.query(query, [table]);
      const exists = result.rows[0].exists;
      
      if (!exists) {
        console.error(`Table '${table}' does not exist`);
        allTablesExist = false;
      } else {
        console.log(`Table '${table}' exists`);
      }
    }
    
    if (!allTablesExist) {
      console.log("Some required tables are missing. Please run init_db.ts script.");
      return false;
    }
    
    // Check if the JSONB columns exist
    const taskColumnQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'task'
        AND data_type = 'jsonb'
      )
    `;
    
    const taskColumnResult = await db.query(taskColumnQuery);
    const taskColumnExists = taskColumnResult.rows[0].exists;
    
    if (!taskColumnExists) {
      console.error("The 'task' column in 'users' table is missing or not of type JSONB");
      return false;
    }
    
    // Test insertion and retrieval
    console.log("Testing database operations...");
    
    const testGuid = crypto.randomUUID();
    const testEmail = "test@example.com";
    const testTask = JSON.stringify({
      task: {
        type: "test",
        data: {
          message: "Database schema test",
          when: new Date().toISOString()
        }
      }
    });
    
    // Test insertion
    const insertQuery = "INSERT INTO users (guid, email, task) VALUES ($1, $2, $3) RETURNING id";
    const insertResult = await db.query(insertQuery, [testGuid, testEmail, testTask]);
    
    if (insertResult.rows.length === 0) {
      console.error("Failed to insert test record");
      return false;
    }
    
    const insertedId = insertResult.rows[0].id;
    console.log(`Inserted test record with ID ${insertedId}`);
    
    // Test retrieval
    const selectQuery = "SELECT task FROM users WHERE guid = $1";
    const selectResult = await db.query(selectQuery, [testGuid]);
    
    if (selectResult.rows.length === 0) {
      console.error("Failed to retrieve test record");
      return false;
    }
    
    // Clean up
    const deleteQuery = "DELETE FROM users WHERE guid = $1";
    await db.query(deleteQuery, [testGuid]);
    
    console.log("Database schema validation complete: All checks passed");
    return true;
  } catch (error) {
    console.error("Error checking database schema:", error);
    return false;
  }
}

// Run the check if this script is executed directly
if (import.meta.main) {
  const result = await checkDatabaseSchema();
  console.log(`Database schema check result: ${result ? "PASSED" : "FAILED"}`);
  Deno.exit(result ? 0 : 1);
}
