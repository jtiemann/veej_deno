// server.ts - Improved application startup flow
import { Application, Router } from "oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { config } from "./config.ts";
import * as db from "./db/db_pool.ts";
import * as dbAccess from "./db/db_access.ts";
import { initRoutes } from "./routes/routes.ts";
import { setupWebSocketServer } from "./websocket/ws_handler.ts";
import { ensureDir } from "https://deno.land/std@0.207.0/fs/ensure_dir.ts";
import { checkDatabaseSchema } from "./scripts/check_db_schema.ts";
import { setupEnhancedMediaDirectories } from "./scripts/enhanced_setup_media.ts";

/**
 * Main application startup function
 */
async function startServer() {
  console.log("Starting V1_rel Deno Server...");

  try {
    // Initialize database connection pool with retry logic
    console.log("Initializing database pool...");
    // Initialize database
    await db.initPool();
    console.log("Database pool initialized");


    // Verify database schema
    console.log("Verifying database schema...");
    const schemaValid = await checkDatabaseSchema();
    
    if (!schemaValid) {
      try {
        await dbAccess.initDatabase();
        console.log("Database schema initialized");
      } catch (err) {
        console.error("Error initializing database schema:", err);
        // Continue anyway, as tables might already exist
      }
    }

    // Ensure media directories exist
    console.log("Setting up media directories...");
    try {
      await setupEnhancedMediaDirectories();
      console.log("Media directories properly initialized");
    } catch (err) {
      console.error("Error setting up media directories:", err);
      // Continue anyway, attempting to create basic directories
      const mediaDir = config.mediaDir;
      await ensureDir(mediaDir);
      await ensureDir(`${mediaDir}/public_links`);
      console.log(`Basic media directories initialized at ${mediaDir}`);
    }

    // Ensure avatar placeholder is in the correct locations
    const fixAvatarScript = new URL("./scripts/fix_avatar_paths.ts", import.meta.url);
    await import(fixAvatarScript.toString());
    console.log("Avatar placeholder paths fixed");

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

    // Comprehensive error handler
    app.use(async (context, next) => {
      try {
        await next();
      } catch (err) {
        console.error("Server error:", err);
        
        // Set appropriate status code based on error
        const status = err.status || 500;
        context.response.status = status;
        
        // Provide more detailed error information in development
        context.response.body = { 
          error: "Server error", 
          message: err.message,
          stack: config.useTls ? undefined : err.stack // Only include stack in development
        };
      }
    });

    // Static file handler
    app.use(async (context, next) => {
      try {
        // Attempt to send static file from the 'public' directory
        await context.send({
          root: `${Deno.cwd()}/public`,
          index: "index.html", // Default file to serve for '/'
        });
      } catch (e) {
         // If file is not found, proceed to next middleware (API router)
         // Only log actual errors, not file-not-found scenarios which are expected
        if (e.name !== 'NotFound') {
          console.error("Static file serving error:", e);
        }
        await next(); // Hand over to API router if static file not found
      }
    });

    // Set up routes
    console.log("Initializing routes...");
    initRoutes(router);
    app.use(router.routes());
    app.use(router.allowedMethods());

    // Set up WebSocket server
    console.log("Starting WebSocket server...");
    setupWebSocketServer(config.wsPort);
    console.log(`WebSocket server started on port ${config.wsPort}`);

    // Start HTTP server
    console.log(`HTTP server starting on port ${config.httpPort}...`);
    await app.listen({ port: config.httpPort });
  } catch (error) {
    console.error("Failed to start server:", error);
    Deno.exit(1);
  }
}

// Start the server
if (import.meta.main) {
  startServer();
}
