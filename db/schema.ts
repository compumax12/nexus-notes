import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { Step } from "../app/task-logic";
export const sharingDefaults = sqliteTable("sharing_defaults", {
  owner: text("owner").primaryKey(),
  emails: text("emails", {mode:"json"}).$type<string[]>().notNull().default([]),
});
export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  updatedAt: text("updated_at").notNull(),
  sharedWith: text("shared_with", { mode: "json" }).$type<string[]>().notNull().default([]),
});
export const tasks = sqliteTable("tasks", {
  recurrence: text("recurrence").notNull().default("none"),
  recurrenceDay: integer("recurrence_day").notNull().default(0),
  recurrenceParent: text("recurrence_parent").unique(),
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  title: text("title").notNull(),
  notes: text("notes").notNull(),
  requester: text("requester").notNull(),
  priority: text("priority").notNull(),
  due: text("due").notNull(),
  progress: integer("progress").notNull().default(0),
  steps: text("steps", { mode: "json" }).$type<Step[]>().notNull().default([]),
  updatedAt: text("updated_at").notNull(),
  sharedWith: text("shared_with", { mode: "json" }).$type<string[]>().notNull().default([]),
});
export const appLocks = sqliteTable("app_locks", {
  recoveryHash: text("recovery_hash").notNull().default(""),
  recoveryCreatedAt: text("recovery_created_at").notNull().default(""),
  owner: text("owner").primaryKey(),
  username: text("username").notNull(),
  salt: text("salt").notNull(),
  passwordHash: text("password_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  windowStart: integer("window_start").notNull().default(0),
});
export const unlockSessions = sqliteTable("unlock_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  owner: text("owner").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
