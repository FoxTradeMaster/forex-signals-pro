import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handlePayPalWebhook } from "../paypalWebhook";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // TEMPORARY: Auto-login endpoint (remove after use)
  app.get("/auto-login", async (req, res) => {
    const secret = req.query.secret as string;
    const expectedSecret = process.env.ADMIN_SETUP_SECRET || "ftm-admin-2025";
    
    if (secret !== expectedSecret) {
      return res.status(403).json({ error: "Invalid secret" });
    }

    try {
      const { getDb } = await import("../db");
      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { sdk } = await import("./sdk");
      const { COOKIE_NAME, ONE_YEAR_MS } = await import("../../shared/const");
      const { getSessionCookieOptions } = await import("./cookies");
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const adminEmail = "support@foxtrademaster.com";
      
      // Get or create user
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, adminEmail))
        .limit(1);

      if (!user) {
        // Create user
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.insert(users).values({
          id: userId,
          email: adminEmail,
          name: "Fox Trade Master Admin",
          role: "admin",
          subscriptionTier: "pro",
          loginMethod: "magic-link",
          createdAt: new Date(),
          lastSignedIn: new Date(),
        });
        
        // Fetch the created user
        [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, adminEmail))
          .limit(1);
      }

      // Create session token
      const sessionToken = await sdk.createSessionToken(user.id, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to admin dashboard
      return res.redirect(302, "/admin");
    } catch (error) {
      console.error("[Auto-Login] Error:", error);
      return res.status(500).json({ error: "Failed to create session" });
    }
  });

  // TEMPORARY: Admin setup endpoint (remove after use)
  app.get("/setup-admin", async (req, res) => {
    const secret = req.query.secret as string;
    const expectedSecret = process.env.ADMIN_SETUP_SECRET || "ftm-admin-2025";
    
    if (secret !== expectedSecret) {
      return res.status(403).json({ error: "Invalid secret" });
    }

    try {
      const { getDb } = await import("../db");
      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const adminEmail = "support@foxtrademaster.com";
      
      // Update user to admin
      await db
        .update(users)
        .set({ role: "admin" })
        .where(eq(users.email, adminEmail));

      return res.json({ 
        success: true, 
        message: `User ${adminEmail} is now an admin. Please remove this endpoint from server/_core/index.ts` 
      });
    } catch (error) {
      console.error("[Admin Setup] Error:", error);
      return res.status(500).json({ error: "Failed to set admin role" });
    }
  });

  // PayPal webhook endpoint
  app.post("/api/paypal/webhook", handlePayPalWebhook);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
