// scripts/enhanced_setup_media.ts
import { ensureDir, exists } from "https://deno.land/std@0.207.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.207.0/path/mod.ts";
import { config } from "../config.ts";

/**
 * Set up enhanced media directories for the application
 * This script ensures all necessary directories and placeholder files exist
 */
async function setupEnhancedMediaDirectories() {
  console.log("Setting up enhanced media directories...");
  
  const mediaDir = config.mediaDir;
  const staticDir = join(Deno.cwd(), "public", "static");
  const imagesDir = join(Deno.cwd(), "public", "images");
  
  try {
    // Create all necessary directories
    const dirsToCreate = [
      // Main media directories
      mediaDir,
      staticDir,
      imagesDir,
      
      // Admin user directories
      join(mediaDir, "admin"),
      join(mediaDir, "admin", "sharedMedia"),
      join(mediaDir, "admin", "public_links"),
      join(mediaDir, "admin", "public_links", "160"),
      join(mediaDir, "admin", "public_links", "768"),
      
      // Sample user directories
      join(mediaDir, "sample"),
      join(mediaDir, "sample", "sharedMedia"),
      join(mediaDir, "sample", "public_links"),
      join(mediaDir, "sample", "public_links", "160"),
      join(mediaDir, "sample", "public_links", "768"),
      
      // Create directories for the currently logged-in user if available from env
      // This is an example - add more users as needed
      join(mediaDir, "test@example.com"),
      join(mediaDir, "test@example.com", "public_links"),
      join(mediaDir, "test@example.com", "public_links", "160"),
    ];
    
    // Create all directories in parallel for efficiency
    await Promise.all(dirsToCreate.map(dir => ensureDir(dir)));
    console.log("All required directories created successfully");
    
    // Create placeholder avatar file
    const placeholderContent = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x40,
      0x08, 0x06, 0x00, 0x00, 0x00, 0xAA, 0x69, 0x71, 0xDE, 0x00, 0x00, 0x00,
      0x06, 0x62, 0x4B, 0x47, 0x44, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0xA0,
      0xBD, 0xA7, 0x93, 0x00, 0x00, 0x00, 0x09, 0x70, 0x48, 0x59, 0x73, 0x00,
      0x00, 0x0B, 0x13, 0x00, 0x00, 0x0B, 0x13, 0x01, 0x00, 0x9A, 0x9C, 0x18,
      0x00, 0x00, 0x00, 0x07, 0x74, 0x49, 0x4D, 0x45, 0x07, 0xE6, 0x04, 0x05,
      0x12, 0x0E, 0x24, 0x94, 0x91, 0x5F, 0x4A, 0x00, 0x00, 0x00, 0x3B, 0x49,
      0x44, 0x41, 0x54, 0x78, 0xDA, 0xED, 0xCE, 0xB1, 0x0D, 0x00, 0x20, 0x0C,
      0x03, 0xC0, 0x73, 0xA2, 0x66, 0xFF, 0x95, 0xE9, 0x22, 0x95, 0x25, 0x5C,
      0x1F, 0x1B, 0xA0, 0xD4, 0x77, 0xDE, 0x7D, 0xB5, 0x0B, 0x88, 0xD9, 0x13,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x68, 0xB1, 0x01, 0x37, 0xAA, 0x03, 0x01, 0x9A, 0xC8, 0x39, 0xDE, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    // List of locations where placeholder avatar should be placed
    const placeholderLocations = [
      join(mediaDir, "avatar_placeholder.png"),
      join(staticDir, "avatar_placeholder.png"),
      join(imagesDir, "avatar_placeholder.png")
    ];
    
    // User-specific placeholders
    const userPlaceholderLocations = [
      join(mediaDir, "admin", "public_links", "avatar_placeholder.png"),
      join(mediaDir, "sample", "public_links", "avatar_placeholder.png"),
      join(mediaDir, "test@example.com", "public_links", "avatar_placeholder.png"),
      
      // Also add scaled versions
      join(mediaDir, "admin", "public_links", "160", "avatar_placeholder.png"),
      join(mediaDir, "sample", "public_links", "160", "avatar_placeholder.png"),
      join(mediaDir, "test@example.com", "public_links", "160", "avatar_placeholder.png")
    ];
    
    // Combine all placeholder locations
    const allPlaceholderLocations = [...placeholderLocations, ...userPlaceholderLocations];
    
    // Create all placeholder files
    for (const location of allPlaceholderLocations) {
      try {
        // Check if file already exists to avoid overwriting
        if (!await exists(location)) {
          await Deno.writeFile(location, placeholderContent);
          console.log(`Created placeholder at: ${location}`);
        } else {
          console.log(`Placeholder already exists at: ${location}`);
        }
      } catch (error) {
        console.error(`Error creating placeholder at ${location}:`, error);
      }
    }
    
    // Create symlinks between public/images and media dir for compatibility
    try {
      const symlinkSource = mediaDir;
      const symlinkTarget = join(Deno.cwd(), "public", "media");
      
      // Create symlink if it doesn't exist
      if (!await exists(symlinkTarget)) {
        try {
          // Different commands for Windows vs Unix
          if (Deno.build.os === "windows") {
            // On Windows, use junction instead of symlink (requires admin)
            const p = Deno.run({
              cmd: ["cmd", "/c", "mklink", "/J", symlinkTarget, symlinkSource],
              stdout: "piped",
              stderr: "piped"
            });
            const status = await p.status();
            p.close();
            
            if (status.success) {
              console.log(`Created junction from ${symlinkSource} to ${symlinkTarget}`);
            } else {
              console.warn("Junction creation failed. This may require admin privileges.");
              // Fallback: copy contents instead of symlink
              await ensureDir(symlinkTarget);
              console.log(`Created directory ${symlinkTarget} as fallback`);
            }
          } else {
            // Unix symlink
            await Deno.symlink(symlinkSource, symlinkTarget);
            console.log(`Created symlink from ${symlinkSource} to ${symlinkTarget}`);
          }
        } catch (error) {
          console.error("Error creating symlink:", error);
          // Fallback: ensure directory exists
          await ensureDir(symlinkTarget);
          console.log(`Created directory ${symlinkTarget} as fallback`);
        }
      }
    } catch (error) {
      console.error("Error with symlink creation:", error);
    }
    
    console.log("Enhanced media directory setup complete");
  } catch (error) {
    console.error("Error in enhanced media setup:", error);
    throw error;
  }
}

// Run the setup if script is executed directly
if (import.meta.main) {
  await setupEnhancedMediaDirectories();
}

export { setupEnhancedMediaDirectories };
