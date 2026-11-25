import {getDb} from "../db";
import {sharingDefaults} from "../db/schema";
import {eq} from "drizzle-orm";
export async function defaultRecipients(owner:string):Promise<string[]> {
  const rows=await getDb().select().from(sharingDefaults).where(eq(sharingDefaults.owner,owner));
  return rows[0]?.emails??[];
}
