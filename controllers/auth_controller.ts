// controllers/auth_controller.ts - Authentication functionality
import { Context } from "oak";
import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { config } from "../config.ts";

// Function to create a JWT token
async function createToken(username: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(config.jwt.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  const token = await create(
    { alg: "HS256", typ: "JWT" },
    { username, exp: getNumericDate(config.jwt.expiresIn) },
    key,
  );

  return token;
}

// Helper function to convert time string to numeric date
function getNumericDate(timeString: string): number {
  const now = new Date();
  let futureDate = new Date(now);
  
  // Process time string
  const value = parseInt(timeString.slice(0, -1));
  const unit = timeString.slice(-1);
  
  switch (unit) {
    case 'd':
      futureDate.setDate(now.getDate() + value);
      break;
    case 'h':
      futureDate.setHours(now.getHours() + value);
      break;
    case 'm':
      futureDate.setMinutes(now.getMinutes() + value);
      break;
    case 's':
      futureDate.setSeconds(now.getSeconds() + value);
      break;
    default:
      // Default to 24 hours
      futureDate.setHours(now.getHours() + 24);
  }
  
  return Math.floor(futureDate.getTime() / 1000);
}

/**
 * Login page handler
 */
export async function login(ctx: Context): Promise<void> {
  try {
    ctx.response.redirect("/login.html");
  } catch (err) {
    console.error("Login error:", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
}

/**
 * Check login credentials 
 */
export async function checkLogin(ctx: Context): Promise<void> {
  try {
    // Get form data
    const body = ctx.request.body({ type: "form" });
    const formData = await body.value;
    
    const username = formData.get("uname");
    const password = formData.get("psw");
    
    console.log(`Login attempt: User: ${username}, Password: ${password}`);
    
    // TODO: Implement proper authentication against database
    // For now, accept any credentials
    
    // Generate JWT token
    const token = await createToken(username);
    
    // Set token in cookie for future authentication
    ctx.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: config.useTls,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    // Return success HTML
    ctx.response.type = "text/html";
    ctx.response.body = `
    <html>
      <head>
        <title>Login Successful</title>
      </head>
      <body>
        <p>Logged In as ${username}</p>
        <script>
          alert('${username}:${password}');
          window.location.href = "/m";
        </script>
      </body>
    </html>
    `;
  } catch (err) {
    console.error("Login error:", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
}

/**
 * Middleware to verify JWT token 
 */
export async function authMiddleware(ctx: Context, next: () => Promise<void>): Promise<void> {
  try {
    const token = ctx.request.headers.get("Authorization")?.split(" ")[1] || 
                  ctx.cookies.get("auth_token");
    
    if (!token) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }
    
    // Verify the token
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(config.jwt.secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    
    const payload = await verify(token, key);
    ctx.state.user = payload.username;
    
    await next();
  } catch (err) {
    console.error("Auth error:", err);
    ctx.response.status = 401;
    ctx.response.body = { error: "Invalid token" };
  }
}
