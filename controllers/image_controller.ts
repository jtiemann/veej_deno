// controllers/image_controller.ts - Image and media handling with improved path resolution
import { Context } from "oak";
import { extname, join, normalize } from "https://deno.land/std@0.207.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.207.0/fs/exists.ts";
import { config } from "../config.ts";

/**
 * Handle image requests with improved path resolution
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
    
    // Security: Normalize path and ensure it doesn't escape the media directory
    const normalizedPath = normalize(path);
    if (normalizedPath.includes("..")) {
      ctx.response.status = 403;
      ctx.response.body = "Forbidden";
      return;
    }
    
    // Construct the file path in the media directory
    const mediaFilePath = join(config.mediaDir, normalizedPath);
    
    // Check if file exists in media directory
    let filePath = mediaFilePath;
    let fileExists = await exists(filePath);
    
    // If not found in media dir, check the public/static directory
    if (!fileExists) {
      const staticFilePath = join(Deno.cwd(), "public", "static", normalizedPath);
      fileExists = await exists(staticFilePath);
      
      if (fileExists) {
        filePath = staticFilePath;
      } else {
        // If still not found, check public/images as a last resort
        const imagesFilePath = join(Deno.cwd(), "public", "images", normalizedPath);
        fileExists = await exists(imagesFilePath);
        
        if (fileExists) {
          filePath = imagesFilePath;
        } else {
          // If this is a request for avatar_placeholder.png, use the default one
          if (normalizedPath.includes("avatar_placeholder.png")) {
            const defaultPlaceholder = join(Deno.cwd(), "public", "static", "avatar_placeholder.png");
            if (await exists(defaultPlaceholder)) {
              filePath = defaultPlaceholder;
              fileExists = true;
            }
          }
        }
      }
    }
    
    // If file doesn't exist after all checks, return 404
    if (!fileExists) {
      console.log(`File not found: ${filePath}`);
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
    try {
      const fileContent = await Deno.readFile(filePath);
      ctx.response.body = fileContent;
      console.log(`Successfully served file: ${filePath}`);
    } catch (readError) {
      console.error(`Error reading file: ${filePath}`, readError);
      ctx.response.status = 500;
      ctx.response.body = "Error reading file";
    }
  } catch (error) {
    console.error("Error serving image:", error);
    ctx.response.status = 500;
    ctx.response.body = "Internal server error";
  }
}

/**
 * Handle special image routes for user public links with improved path handling
 */
export async function getUserImage(ctx: Context): Promise<void> {
  try {
    const { user, size, filename } = ctx.params;
    
    if (!user || !filename) {
      ctx.response.status = 404;
      ctx.response.body = "File not found";
      return;
    }
    
    // Security: Normalize paths and ensure they don't escape the media directory
    const normalizedUser = normalize(user);
    const normalizedFilename = normalize(filename);
    
    if (normalizedUser.includes("..") || normalizedFilename.includes("..") || 
        (size && normalize(size).includes(".."))) {
      ctx.response.status = 403;
      ctx.response.body = "Forbidden";
      return;
    }
    
    // Construct paths to check - try several locations
    const pathsToCheck = [];
    
    // Construct path based on whether size is specified
    if (size) {
      // Primary path in media directory with size
      pathsToCheck.push(join(config.mediaDir, normalizedUser, "public_links", size, normalizedFilename));
    } else {
      // Primary path in media directory without size
      pathsToCheck.push(join(config.mediaDir, normalizedUser, "public_links", normalizedFilename));
    }
    
    // Add fallback paths
    // Check if filename is avatar_placeholder.png
    if (normalizedFilename === "avatar_placeholder.png") {
      // Add additional places to look for the placeholder
      pathsToCheck.push(join(config.mediaDir, "avatar_placeholder.png"));
      pathsToCheck.push(join(Deno.cwd(), "public", "static", "avatar_placeholder.png"));
      pathsToCheck.push(join(Deno.cwd(), "public", "images", "avatar_placeholder.png"));
    }
    
    // Find the first file that exists
    let filePath = null;
    for (const path of pathsToCheck) {
      if (await exists(path)) {
        filePath = path;
        break;
      }
    }
    
    // If file doesn't exist after all checks, return 404
    if (!filePath) {
      console.log(`User image not found in any location for user ${user}, filename ${filename}`);
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
    try {
      const fileContent = await Deno.readFile(filePath);
      ctx.response.body = fileContent;
      console.log(`Successfully served user image: ${filePath}`);
    } catch (readError) {
      console.error(`Error reading user image: ${filePath}`, readError);
      ctx.response.status = 500;
      ctx.response.body = "Error reading file";
    }
  } catch (error) {
    console.error("Error serving user image:", error);
    ctx.response.status = 500;
    ctx.response.body = "Internal server error";
  }
}
