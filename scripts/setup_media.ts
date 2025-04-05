// scripts/setup_media.ts - Initialize media directories
import { ensureDir } from "https://deno.land/std@0.207.0/fs/ensure_dir.ts";
import { join } from "https://deno.land/std@0.207.0/path/mod.ts";
import { config } from "../config.ts";

/**
 * Set up media directories for the application
 */
async function setupMediaDirectories() {
  console.log("Setting up media directories...");
  
  const mediaDir = config.mediaDir;
  
  try {
    // Create the main media directory
    await ensureDir(mediaDir);
    console.log(`Created main media directory: ${mediaDir}`);
    
    // Create a sample user directory structure
    const sampleUserDirs = [
      // Admin user directories
      join(mediaDir, "admin"),
      join(mediaDir, "admin", "sharedMedia"),
      join(mediaDir, "admin", "public_links"),
      
      // Sample user directories
      join(mediaDir, "sample"),
      join(mediaDir, "sample", "sharedMedia"),
      join(mediaDir, "sample", "public_links"),
      
      // Ensure different sizes directories for images
      join(mediaDir, "admin", "public_links", "160"),
      join(mediaDir, "admin", "public_links", "768"),
      join(mediaDir, "sample", "public_links", "160"),
      join(mediaDir, "sample", "public_links", "768")
    ];
    
    // Create all directories
    for (const dir of sampleUserDirs) {
      await ensureDir(dir);
      console.log(`Created directory: ${dir}`);
    }
    
    // Create placeholder avatar file
    const placeholderPath = join(mediaDir, "avatar_placeholder.png");
    
    // Check if placeholder already exists
    try {
      await Deno.stat(placeholderPath);
      console.log("Placeholder avatar already exists");
    } catch {
      // Create a simple 1x1 transparent pixel PNG
      const transparentPixelPNG = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
        0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
      
      await Deno.writeFile(placeholderPath, transparentPixelPNG);
      console.log(`Created placeholder avatar at: ${placeholderPath}`);
      
      // Copy placeholder to user directories
      await Deno.copyFile(placeholderPath, join(mediaDir, "admin", "avatar_placeholder.png"));
      await Deno.copyFile(placeholderPath, join(mediaDir, "sample", "avatar_placeholder.png"));
      
      console.log("Copied placeholder avatar to user directories");
    }
    
    console.log("Media directory setup complete");
  } catch (error) {
    console.error("Error setting up media directories:", error);
    throw error;
  }
}
const staticDir = join(Deno.cwd(), "public", "static");
await ensureDir(staticDir);
await Deno.copyFile(placeholderPath, join(staticDir, "avatar_placeholder.png"));
console.log(`Copied placeholder avatar to static directory: ${join(staticDir, "avatar_placeholder.png")}`);


// Run the setup if script is executed directly
if (import.meta.main) {
  await setupMediaDirectories();
}
