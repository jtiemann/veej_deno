// controllers/image_controller.ts - Image and media handling
import { Context } from "oak";
import { extname, join } from "https://deno.land/std@0.207.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.207.0/fs/exists.ts";
import { config } from "../config.ts";

/**
 * Handle image requests
 */
export async function getImage(ctx: Context): Promise<void> {
  try {
    // Get the requested path
    const path = ctx.params.path;
    
    if (!path) {
      ctx.response.status = 404;
      ctx.response.body = "File not found";
      return;
    }
    
    // Construct the file path
    const filePath = join(config.mediaDir, path);
    
    // Check if file exists
    const fileExists = await exists(filePath);
    if (!fileExists) {
      ctx.response.status = 404;
      ctx.response.body = "File not found";
      return;
    }
    
    // Get file extension
    const ext = extname(filePath).toLowerCase();
    
    // Set content type based on extension
    let contentType = "application/octet-stream";
    switch (ext) {
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".gif":
        contentType = "image/gif";
        break;
      case ".svg":
        contentType = "image/svg+xml";
        break;
      case ".css":
        contentType = "text/css";
        break;
      case ".js":
        contentType = "application/javascript";
        break;
      case ".json":
        contentType = "application/json";
        break;
      case ".html":
        contentType = "text/html";
        break;
    }
    
    // Set response headers
    ctx.response.headers.set("Content-Type", contentType);
    ctx.response.headers.set("Cache-Control", "max-age=86400, public");
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    
    // Stream the file to the response
    const fileContent = await Deno.readFile(filePath);
    ctx.response.body = fileContent;
  } catch (error) {
    console.error("Error serving image:", error);
    ctx.response.status = 500;
    ctx.response.body = "Internal server error";
  }
}

/**
 * Handle special image routes for user public links
 */
export async function getUserImage(ctx: Context): Promise<void> {
  try {
    const { user, size, filename } = ctx.params;
    
    if (!user || !filename) {
      ctx.response.status = 404;
      ctx.response.body = "File not found";
      return;
    }
    
    // Construct path based on whether size is specified
    let filePath;
    if (size) {
      filePath = join(config.mediaDir, user, "public_links", size, filename);
    } else {
      filePath = join(config.mediaDir, user, "public_links", filename);
    }
    
    // Check if file exists
    const fileExists = await exists(filePath);
    if (!fileExists) {
      ctx.response.status = 404;
      ctx.response.body = "File not found";
      return;
    }
    
    // Get file extension
    const ext = extname(filePath).toLowerCase();
    
    // Set content type based on extension
    let contentType = "application/octet-stream";
    switch (ext) {
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".gif":
        contentType = "image/gif";
        break;
      case ".svg":
        contentType = "image/svg+xml";
        break;
    }
    
    // Set response headers
    ctx.response.headers.set("Content-Type", contentType);
    ctx.response.headers.set("Cache-Control", "max-age=86400, public");
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    
    // Stream the file to the response
    const fileContent = await Deno.readFile(filePath);
    ctx.response.body = fileContent;
  } catch (error) {
    console.error("Error serving user image:", error);
    ctx.response.status = 500;
    ctx.response.body = "Internal server error";
  }
}
