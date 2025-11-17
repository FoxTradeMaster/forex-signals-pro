import { randomBytes } from "crypto";
import { getDb } from "../db";
import { magicLinks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Generate a secure random token for magic links
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a magic link for email authentication
 * @param email User's email address
 * @param tier Subscription tier (premium or pro)
 * @returns Magic link token
 */
export async function createMagicLink(
  email: string,
  tier: "premium" | "pro"
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const token = generateToken();
  const id = `ml_${Date.now()}_${randomBytes(8).toString("hex")}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(magicLinks).values({
    id,
    email,
    token,
    tier,
    expiresAt,
  });

  return token;
}

/**
 * Verify a magic link token and return the associated email and tier
 * @param token Magic link token
 * @returns Email and tier if valid, null otherwise
 */
export async function verifyMagicLink(
  token: string
): Promise<{ email: string; tier: "premium" | "pro" } | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [link] = await db
    .select()
    .from(magicLinks)
    .where(eq(magicLinks.token, token))
    .limit(1);

  if (!link) return null;

  // Check if token is expired
  if (link.expiresAt < new Date()) return null;

  // Check if token has already been used
  if (link.usedAt) return null;

  // Mark token as used
  await db
    .update(magicLinks)
    .set({ usedAt: new Date() })
    .where(eq(magicLinks.token, token));

  return {
    email: link.email,
    tier: link.tier as "premium" | "pro",
  };
}
