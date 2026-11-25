import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../db";
import { appLocks, unlockSessions } from "../db/schema";
import { digest } from "./lock-crypto";
export const LOCK_COOKIE = "mi-avance-unlock";
export async function lockConfigured(owner: string) {
  const rows = await getDb().select({ owner: appLocks.owner }).from(appLocks).where(eq(appLocks.owner, owner));
  return rows.length > 0;
}
export async function isUnlocked(owner: string) {
  const token = (await cookies()).get(LOCK_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const rows = await getDb().select({ owner: unlockSessions.owner }).from(unlockSessions).where(and(eq(unlockSessions.owner, owner), eq(unlockSessions.tokenHash, await digest(token)), gt(unlockSessions.expiresAt, Date.now())));
  return rows.length > 0;
}
