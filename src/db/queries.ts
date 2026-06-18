import type { SessionUser } from "@/lib/auth";

// Public profile lookup by Telegram id. Returns null if absent / DB unavailable.
export async function getUserById(id: number) {
  if (!process.env.DATABASE_URL || !Number.isFinite(id)) return null;
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  } catch (e) {
    console.error("getUserById failed:", e);
    return null;
  }
}

// Best-effort: create/refresh the users row on login. Never blocks auth — if the
// DB is unconfigured or unreachable, we log and move on (the session still
// issues). `db` is imported lazily so a missing DATABASE_URL can't break login.
export async function upsertUser(u: SessionUser): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const fields = {
      username: u.username ?? null,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      photoUrl: u.photoUrl ?? null,
    };
    await db
      .insert(users)
      .values({ id: u.id, ...fields })
      .onConflictDoUpdate({
        target: users.id,
        set: { ...fields, updatedAt: new Date() },
      });
  } catch (e) {
    console.error("upsertUser failed:", e);
  }
}
