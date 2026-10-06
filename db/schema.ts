import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  education: text("education").notNull(),
  experience: text("experience").notNull(),
  roles: text("roles").notNull(),
  skills: text("skills").notNull(),
  workMode: text("work_mode").notNull(),
  relocation: integer("relocation", { mode: "boolean" }).notNull(),
  preferredRegions: text("preferred_regions").notNull(),
  updatedAt: text("updated_at").notNull(),
});
