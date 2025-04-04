// routes/routes.ts - HTTP routing configuration
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
  
  // Image routes
  router.get("/images/:path*", getImage);
  router.get("/images/:user/public_links/:filename", getUserImage);
  router.get("/images/:user/public_links/:size/:filename", getUserImage);
  
  // Fallback for unfound routes
  router.all("/(.*)", (ctx) => {
    ctx.response.status = 404;
    ctx.response.body = "Not found";
  });
}
