# V1_rel Deno Server

A modern Deno-based backend for messaging and file sharing with real-time communication via WebSockets. This project reimplements the original Erlang/OTP backend in TypeScript for Deno.

## Overview

This application provides a robust backend for messaging applications with support for:
- Real-time communication via WebSockets
- User authentication with JWT tokens
- Persistent message storage in PostgreSQL
- File/media sharing
- Push notifications via Firebase Cloud Messaging (FCM)

## Requirements

- [Deno](https://deno.land/) v1.37 or higher
- PostgreSQL 12 or higher
- (Optional) Firebase Cloud Messaging account for push notifications

## Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/v1_rel_deno.git
   cd v1_rel_deno
   ```

2. Create a `.env` file with your configuration (optional)
   ```
   PORT=8088
   WS_PORT=8089
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=veej
   MEDIA_DIR=./media
   FCM_API_KEY=your_fcm_api_key
   JWT_SECRET=your_jwt_secret
   ```

3. Initialize the database
   ```bash
   deno run --allow-net --allow-env --allow-read scripts/init_db.ts
   ```

4. Set up media directories
   ```bash
   deno run --allow-net --allow-env --allow-read --allow-write scripts/setup_media.ts
   ```

## Running the Server

Start the server with:

```bash
deno run --allow-net --allow-env --allow-read --allow-write server.ts
```

For development with auto-reload:

```bash
deno run --watch --allow-net --allow-env --allow-read --allow-write server.ts
```

## API Endpoints

- `/` - Main web interface
- `/m` - Secondary web interface
- `/login` - Login page
- `/checkLogin` - Authentication endpoint
- `/images/[...]` - Image handling
- `/static/[...]` - Static resources

## WebSocket Protocol

The application uses a custom WebSocket protocol with the following message types:

- `authenticate` - User authentication
- `My Contacts:` - Retrieve contacts for a user
- `FCM Message:` - Register FCM token for a user
- `My Messages:` - Get messages for a specific recipient
- `All Messages` - Get all messages
- `Send Message` - Send a new message
- `My PhotoData` - Upload a photo
- `Media Message` - Request media content

## Database Schema

The application uses several PostgreSQL tables:
- `users` - User messages
- `ext_users` - External user messages
- `contacts` - User contacts
- `user_auth` - User authentication data

## Technical Architecture

### Main Components

1. `server.ts` - Main application entry point
2. `websocket/ws_handler.ts` - WebSocket handling
3. `controllers/auth_controller.ts` - Authentication
4. `controllers/image_controller.ts` - Image processing
5. `services/fcm_service.ts` - Firebase Cloud Messaging integration
6. `db/db_pool.ts` - Database connection pool
7. `db/db_access.ts` - Database access functions

## Project Structure

```
/
├── config.ts              # Configuration settings
├── server.ts              # Main server file
├── controllers/           # HTTP endpoint handlers
│   ├── auth_controller.ts # Authentication
│   └── image_controller.ts# Image handling
├── db/                    # Database layer
│   ├── db_pool.ts         # Connection pooling
│   └── db_access.ts       # Database operations
├── routes/                # HTTP routing
│   └── routes.ts          # Route definitions
├── scripts/               # Utility scripts
│   ├── init_db.ts         # Database initialization
│   └── setup_media.ts     # Media directory setup
├── services/              # Business logic services
│   └── fcm_service.ts     # Push notifications
├── websocket/             # WebSocket components
│   ├── ws_handler.ts      # WebSocket message handling
│   └── ws_utils.ts        # WebSocket helpers
├── public/                # Static files
│   ├── index.html         # Main web interface
│   ├── index2.html        # Secondary interface
│   ├── login.html         # Login page
│   └── static/            # CSS, JS, etc.
└── media/                 # Media storage
    └── ...                # User directories and files
```

## Security Considerations

- JWT tokens for authentication
- Secure password hashing
- Input validation and sanitization
- Protection against SQL injection
- CORS configuration for frontend integration

## WebSocket Client Example

```javascript
const ws = new WebSocket("ws://localhost:8089");

// Authenticate after connecting
ws.onopen = function() {
  ws.send("authenticate::username::password");
};

// Handle incoming messages
ws.onmessage = function(evt) {
  const message = evt.data;
  console.log("Received:", message);
  
  // Handle different response types
  if (message.startsWith("Authenticated!")) {
    // Authentication successful, get contacts
    ws.send("My Contacts:");
  } else if (message.startsWith("Contacts Get Complete!")) {
    // Process contacts
    const contactsData = message.split('Contacts Get Complete!  ')[1];
    const contacts = contactsData.split("||").map(contact => {
      const [email, task] = contact.split("+?+");
      return { email, task: JSON.parse(task) };
    });
    console.log("Contacts:", contacts);
  }
};

// Reconnect if disconnected
ws.onclose = function() {
  console.log("Connection closed, reconnecting...");
  setTimeout(() => {
    // Reconnect logic
  }, 3000);
};
```

## Future Improvements

- Enhanced security with OAuth 2.0
- End-to-end encryption for messages
- Message delivery confirmations
- Group chat support
- File type validation and virus scanning
- Rate limiting
- More comprehensive logging
- CI/CD integration

## License

This project is licensed under the BSD 3-Clause License - see the LICENSE file for details.
