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
import path from "path";
import { fileURLToPath } from "url";

// Auto-run DB migrations on startup so the schema is always current
async function runMigrationsOnStartup() {
  if (!process.env.DATABASE_URL) {
    console.warn('[DB] DATABASE_URL not set, skipping auto-migration.');
    return;
  }
  try {
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    const postgres = (await import('postgres')).default;
    // Try multiple candidate paths so this works in both dev (ts-node/vite) and
    // production (compiled to dist/) on Render.
    const candidates = [
      path.resolve(process.cwd(), 'drizzle'),                          // CWD/drizzle (Render)
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../drizzle'), // relative to compiled file
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../drizzle'),
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'drizzle'),
    ];
    const { existsSync } = await import('fs');
    const migrationsFolder = candidates.find(p => existsSync(p)) || candidates[0];
    console.log('[DB] Using migrations folder:', migrationsFolder);
    const client = postgres(process.env.DATABASE_URL, { max: 1, ssl: 'require' });
    const db = drizzle(client);
    await migrate(db, { migrationsFolder });
    await client.end();
    console.log('[DB] Auto-migration completed successfully.');
  } catch (err: any) {
    // Non-fatal: log and continue — the server should still start
    console.warn('[DB] Auto-migration warning (non-fatal):', err?.message || err);
  }
}

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
  // Bootstrap: create all tables if they don't exist (raw SQL, always works)
  const { bootstrapDatabase } = await import('../bootstrapDb');
  await bootstrapDatabase();
  // Also run drizzle migrations (handles schema changes/column additions)
  await runMigrationsOnStartup();
  // Seed AI Brain stats row so the AI Brain page always has data to display
  try {
    const { ensureAiBrainStatsRow } = await import('../aiBrain');
    await ensureAiBrainStatsRow();
  } catch (err) {
    console.warn('[AI Brain] Startup stats seed warning (non-fatal):', err);
  }

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

  // Health check endpoint — shows DB status and migration state
  app.get("/api/health", async (req, res) => {
    const status: Record<string, any> = {
      ok: true,
      timestamp: new Date().toISOString(),
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? `SET (${process.env.DATABASE_URL.slice(0, 20)}...)` : 'NOT SET',
        POLYGON_API_KEY: process.env.POLYGON_API_KEY ? `SET (${process.env.POLYGON_API_KEY.length} chars)` : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'unknown',
      },
      db: { connected: false, signalsTable: false, signalCount: 0, error: null as string | null },
    };
    try {
      const { getDb } = await import('../db');
      const { signals } = await import('../../drizzle/schema');
      const db = await getDb();
      if (db) {
        status.db.connected = true;
        try {
          const rows = await db.select().from(signals).limit(5);
          status.db.signalsTable = true;
          status.db.signalCount = rows.length;
        } catch (e: any) {
          status.db.signalsTable = false;
          status.db.error = e?.message?.slice(0, 200);
        }
      }
    } catch (e: any) {
      status.db.error = e?.message?.slice(0, 200);
    }
    res.json(status);
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
