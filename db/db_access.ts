// db/db_access.ts - Database access functions
import * as db from "./db_pool.ts";

/**
 * Insert a message into the users table with improved error handling
 */
export async function insertMessageIntoUsers(guid: string, email: string, task: string): Promise<boolean> {
  try {
    console.log(`Inserting into users: guid=${guid}, email=${email}`);
    
    // Make sure task is a valid JSON string
    const taskJson = typeof task === 'string' ? task : JSON.stringify(task);
    
    const sql = "INSERT INTO users (guid, email, task) VALUES ($1, $2, $3)";
    await db.query(sql, [guid, email, taskJson]);
    
    // Verify insertion with a select query
    const verifySQL = "SELECT id FROM users WHERE guid = $1 LIMIT 1";
    const result = await db.query(verifySQL, [guid]);
    
    if (result.rows.length > 0) {
      console.log(`Successfully inserted message into users table for guid ${guid}`);
      return true;
    } else {
      console.error(`Failed to verify insertion into users table for guid ${guid}`);
      return false;
    }
  } catch (err) {
    console.error("Error inserting into users:", err);
    return false;
  }
}

/**
 * Insert a message into the ext_users table with improved error handling
 */
export async function insertMessageIntoExtUsers(guid: string, email: string, task: string): Promise<boolean> {
  try {
    console.log(`Inserting into ext_users: guid=${guid}, email=${email}`);
    
    // Make sure task is a valid JSON string
    const taskJson = typeof task === 'string' ? task : JSON.stringify(task);
    
    const sql = "INSERT INTO ext_users (guid, email, task) VALUES ($1, $2, $3)";
    await db.query(sql, [guid, email, taskJson]);
    
    // Verify insertion with a select query
    const verifySQL = "SELECT id FROM ext_users WHERE guid = $1 LIMIT 1";
    const result = await db.query(verifySQL, [guid]);
    
    if (result.rows.length > 0) {
      console.log(`Successfully inserted message into ext_users table for guid ${guid}`);
      return true;
    } else {
      console.error(`Failed to verify insertion into ext_users table for guid ${guid}`);
      return false;
    }
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
    
    // Create user_auth table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_auth (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      )
    `);
    
    // Create indexes
    await db.query("CREATE INDEX IF NOT EXISTS users_email_idx ON users (email)");
    await db.query("CREATE INDEX IF NOT EXISTS ext_users_email_idx ON ext_users (email)");
    await db.query("CREATE INDEX IF NOT EXISTS contacts_owner_idx ON contacts (owner)");
    await db.query("CREATE INDEX IF NOT EXISTS users_guid_idx ON users (guid)");
    await db.query("CREATE INDEX IF NOT EXISTS ext_users_guid_idx ON ext_users (guid)");
    
    console.log("Database tables initialized");
  } catch (err) {
    console.error("Error initializing database tables:", err);
    throw err;
  }
  
}

export async function insertMessageWithTransaction(guid: string, respondTo: string, email: string, task: string): Promise<boolean> {
  try {
    return await db.transaction(async (client) => {
      // Insert into users table
      const userSql = "INSERT INTO users (guid, email, task) VALUES ($1, $2, $3)";
      await client.queryObject(userSql, [guid, respondTo, task]);
      
      // Insert into ext_users table
      const extUserSql = "INSERT INTO ext_users (guid, email, task) VALUES ($1, $2, $3)";
      await client.queryObject(extUserSql, [guid, email, task]);
      
      return true;
    });
  } catch (err) {
    console.error("Error inserting message with transaction:", err);
    return false;
  }
}

// db/db_access.ts - Add these new functions

/**
 * Add a new contact to the user's contacts list
 */
export async function addContact(owner: string, friendEmail: string, friendName: string = ""): Promise<boolean> {
  try {
    // Create contact task data
    const contactTask = {
      task: {
        data: {
          name: friendName || friendEmail, // Use email as name if no name provided
          avatar: "avatar_placeholder.png",
          email: friendEmail
        }
      }
    };
    
    // Check if contact already exists
    const existingContacts = await getContacts(owner);
    const exists = existingContacts.some(contact => contact.email.toLowerCase() === friendEmail.toLowerCase());
    
    if (exists) {
      console.log(`Contact ${friendEmail} already exists for ${owner}`);
      return false;
    }
    
    // Insert the contact
    const sql = "INSERT INTO contacts (owner, email, task) VALUES ($1, $2, $3)";
    await query(sql, [owner, friendEmail, JSON.stringify(contactTask)]);
    
    console.log(`Added contact ${friendEmail} for ${owner}`);
    return true;
  } catch (err) {
    console.error("Error adding contact:", err);
    return false;
  }
}

/**
 * Send a friend invitation to a user
 */
export async function sendFriendInvitation(sender: string, recipient: string, message: string = ""): Promise<boolean> {
  try {
    // Create a unique ID for the invitation
    const guid = crypto.randomUUID();
    
    // Create invitation task
    const invitationTask = {
      task: {
        type: 'vFriendInvite',
        sendTo: recipient,
        meta: {
          oneshot: false,
          vcentral: true,
          endpoint: "",
          settings: [{"views": {"totalViews": 1}}, {"template": "default"}]
        },
        data: {
          from: sender,
          respondTo: sender,
          avatar: "avatar_placeholder.png",
          code: guid,
          when: new Date().toISOString(),
          email: recipient,
          name: "Friend Invitation",
          username: sender,
          message: message || `${sender} would like to add you as a contact.`,
          attachments: [],
          invitation: true
        }
      }
    };
    
    // Insert into both tables (same as sending a message)
    return await db.transaction(async (client) => {
      // Insert into users table
      const userSql = "INSERT INTO users (guid, email, task) VALUES ($1, $2, $3)";
      await client.queryObject(userSql, [guid, sender, JSON.stringify(invitationTask)]);
      
      // Insert into ext_users table
      const extUserSql = "INSERT INTO ext_users (guid, email, task) VALUES ($1, $2, $3)";
      await client.queryObject(extUserSql, [guid, recipient, JSON.stringify(invitationTask)]);
      
      return true;
    });
  } catch (err) {
    console.error("Error sending friend invitation:", err);
    return false;
  }
}

/**
 * Accept a friend invitation
 */
export async function acceptFriendInvitation(invitationGuid: string): Promise<boolean> {
  try {
    // Get the invitation details
    const sql = "SELECT email, task FROM ext_users WHERE guid = $1";
    const result = await query(sql, [invitationGuid]);
    
    if (result.rows.length === 0) {
      console.error("Invitation not found:", invitationGuid);
      return false;
    }
    
    const invitation = result.rows[0];
    const task = typeof invitation.task === 'string' ? JSON.parse(invitation.task) : invitation.task;
    
    // Extract sender and recipient
    const sender = task.task.data.respondTo;
    const recipient = task.task.data.email;
    
    // Add each other to contacts
    const added1 = await addContact(recipient, sender);
    const added2 = await addContact(sender, recipient);
    
    return added1 || added2; // Return true if at least one contact was added
  } catch (err) {
    console.error("Error accepting friend invitation:", err);
    return false;
  }
}
