// server.ts - Main application entry point
import { Application, Router } from "oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { config } from "./config.ts";
import * as db from "./db/db_pool.ts";
import * as dbAccess from "./db/db_access.ts";
import { initRoutes } from "./routes/routes.ts";
import { setupWebSocketServer } from "./websocket/ws_handler.ts";
import { ensureDir } from "https://deno.land/std@0.207.0/fs/ensure_dir.ts";

console.log("Starting V1_rel Deno Server...");

// Initialize database
await db.initPool();
console.log("Database pool initialized");

// Initialize database schema if needed
try {
  await dbAccess.initDatabase();
  console.log("Database schema initialized");
} catch (err) {
  console.error("Error initializing database schema:", err);
  // Continue anyway, as tables might already exist
}

// Ensure media directories exist
const mediaDir = config.mediaDir;
await ensureDir(mediaDir);
await ensureDir(`${mediaDir}/public_links`);
console.log(`Media directories initialized at ${mediaDir}`);

// Create Oak application for HTTP endpoints
const app = new Application();
const router = new Router();

// Add CORS middleware
app.use(oakCors({
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization",
  credentials: true,
}));

// Error handler
app.use(async (context, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Server error:", err);
    context.response.status = 500;
    context.response.body = { error: "Internal server error" };
  }
});

app.use(async (context, next) => {
  try {
    // Attempt to send static file from the 'public' directory
    await context.send({
      root: `${Deno.cwd()}/public`,
      index: "index.html", // Default file to serve for '/'
    });
  } catch (e) {
     // If file is not found (context.send throws), proceed to next middleware (API router)
     // Only log actual errors, not file-not-found scenarios which are expected
    if (e.name !== 'NotFound') {
        console.error("Static file serving error:", e)
    }
    await next(); // Hand over to API router if static file not found
  }
});

// Set up routes
initRoutes(router);
app.use(router.routes());
app.use(router.allowedMethods());

// Start WebSocket server
setupWebSocketServer(config.wsPort);
console.log(`WebSocket server started on port ${config.wsPort}`);

// Start HTTP server
console.log(`HTTP server starting on port ${config.httpPort}...`);
await app.listen({ port: config.httpPort });
