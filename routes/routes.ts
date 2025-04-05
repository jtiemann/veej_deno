// routes/routes.ts - HTTP routing configuration with improved path handling
import { Router } from "oak";
import { login, checkLogin } from "../controllers/auth_controller.ts";
import { getImage, getUserImage } from "../controllers/image_controller.ts";

/**
 * Configure all routes for the application
 */
export function initRoutes(router: Router): void {
  // Static routes
  router.get("/", (ctx) => {
    ctx.response.redirect("/index.html");
  });
  
  router.get("/m", (ctx) => {
    ctx.response.redirect("/index2.html");
  });
  
  router.get("/login", (ctx) => {
    ctx.response.redirect("/login.html");
  });
  
  // Authentication routes
  router.post("/checkLogin", checkLogin);
  
  // Image routes - Order matters: more specific routes first
  // First handle avatar placeholders by direct path
  router.get("/static/avatar_placeholder.png", async (ctx) => {
    ctx.params = { path: "avatar_placeholder.png" };
    await getImage(ctx);
  });
  
  router.get("/images/avatar_placeholder.png", async (ctx) => {
    ctx.params = { path: "avatar_placeholder.png" };
    await getImage(ctx);
  });
  
  // Handles images like /images/user/public_links/160/avatar.jpg
  router.get("/images/:user/public_links/:size/:filename", getUserImage);
  
  // Handles images like /images/user/public_links/avatar.jpg
  router.get("/images/:user/public_links/:filename", getUserImage);
  
  // Handles general images/files within the media directory, e.g., /images/avatar_placeholder.png
  router.get("/images/:path*", getImage);
  
  // Add a catch-all for static files that might be requested from unexpected locations
  router.get("/static/:path*", async (ctx) => {
    try {
      await ctx.send({
        root: `${Deno.cwd()}/public/static`,
        path: ctx.params.path,
      });
    } catch {
      // If not found in static, try in the media directory via getImage
      ctx.params = { path: ctx.params.path };
      await getImage(ctx);
    }
  });
}
