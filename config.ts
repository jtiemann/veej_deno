// config.ts - Application configuration

interface Config {
  // Server config
  httpPort: number;
  wsPort: number;
  useTls: boolean;
  
  // Database config
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    poolSize: number;
  };
  
  // Firebase Cloud Messaging
  fcm: {
    apiKey: string;
    enabled: boolean;
  };
  
  // Media storage
  mediaDir: string;
  
  // JWT Authentication
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

// Default configuration
export const config: Config = {
  httpPort: 8088,
  wsPort: 8089,
  useTls: false,
  
  database: {
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "kermit",
    database: "veej",
    poolSize: 10
  },
  
  fcm: {
    apiKey: "YOUR_FCM_API_KEY", // Replace with actual key for production
    enabled: false
  },
  
  mediaDir: "./media",
  
  jwt: {
    secret: "veej_app_secure_jwt_secret_key", // Replace with actual secret for production
    expiresIn: "7d"
  }
};

// Load environment variables if available
if (Deno.env.get("PORT")) {
  config.httpPort = parseInt(Deno.env.get("PORT") || "8088");
}

if (Deno.env.get("WS_PORT")) {
  config.wsPort = parseInt(Deno.env.get("WS_PORT") || "8089");
}

if (Deno.env.get("DB_HOST")) {
  config.database.host = Deno.env.get("DB_HOST") || "localhost";
}

if (Deno.env.get("DB_PORT")) {
  config.database.port = parseInt(Deno.env.get("DB_PORT") || "5432");
}

if (Deno.env.get("DB_USER")) {
  config.database.user = Deno.env.get("DB_USER") || "postgres";
}

if (Deno.env.get("DB_PASSWORD")) {
  config.database.password = Deno.env.get("DB_PASSWORD") || "kermit";
}

if (Deno.env.get("DB_NAME")) {
  config.database.database = Deno.env.get("DB_NAME") || "veej";
}

if (Deno.env.get("MEDIA_DIR")) {
  config.mediaDir = Deno.env.get("MEDIA_DIR") || "./media";
}

if (Deno.env.get("FCM_API_KEY")) {
  config.fcm.apiKey = Deno.env.get("FCM_API_KEY") || "";
  config.fcm.enabled = true;
}

if (Deno.env.get("JWT_SECRET")) {
  config.jwt.secret = Deno.env.get("JWT_SECRET") || "veej_app_secure_jwt_secret_key";
}
