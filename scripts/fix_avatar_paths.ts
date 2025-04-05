import { ensureDir, exists } from "https://deno.land/std@0.207.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.207.0/path/mod.ts";
import { config } from "../config.ts";

async function fixAvatarPlaceholderPaths() {
  console.log("Fixing avatar placeholder paths...");
  
  // Define paths
  const mediaPath = join(config.mediaDir, "avatar_placeholder.png");
  const staticDir = join(Deno.cwd(), "public", "static");
  const staticPath = join(staticDir, "avatar_placeholder.png");
  
  // Check if media directory avatar exists
  let mediaExists = false;
  try {
    mediaExists = await exists(mediaPath);
  } catch (e) {
    console.error(`Error checking media path: ${e.message}`);
  }
  
  // Ensure static directory exists
  await ensureDir(staticDir);
  
  // If media avatar exists, copy to static directory
  if (mediaExists) {
    try {
      await Deno.copyFile(mediaPath, staticPath);
      console.log(`Copied avatar from ${mediaPath} to ${staticPath}`);
    } catch (e) {
      console.error(`Error copying file: ${e.message}`);
    }
  } else {
    // If media avatar doesn't exist, create a simple placeholder in both locations
    console.log("Creating new placeholder avatars...");
    
    // // Create a simple 1x1 transparent pixel PNG
    // const transparentPixelPNG = new Uint8Array([
    //   0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    //   0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    //   0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    //   0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    //   0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
    //   0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    // ]);

    const avatarPlaceholder = "/static/avatar_placeholder.png";
    
    // Write to both locations
    await ensureDir(config.mediaDir);
    await Deno.writeFile(mediaPath, avatarPlaceholder);
    await Deno.writeFile(staticPath, avatarPlaceholder);
    
    console.log(`Created placeholder avatars at: ${mediaPath} and ${staticPath}`);
  }
  
  console.log("Avatar path fixing complete");
}

// Run the function if script is executed directly
if (import.meta.main) {
  await fixAvatarPlaceholderPaths();
}