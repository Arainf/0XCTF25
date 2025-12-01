import { sql } from "drizzle-orm";
import { 
  mysqlTable, 
  text, 
  varchar, 
  int, 
  boolean, 
  timestamp,
  json
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  score: int("score").default(0),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const challenges = mysqlTable("challenges", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  description: text("description").notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  difficulty: varchar("difficulty", { length: 50 }).notNull(),
  points: int("points").notNull(),
  flagHash: text("flag_hash").notNull(),
  flagSalt: text("flag_salt").notNull(),
  published: boolean("published").default(false),
  globalSolved: boolean("global_solved").default(false),
  creatorId: varchar("creator_id", { length: 36 }).notNull().references(() => users.id),
  artifacts: json("artifacts").$type<Array<{name: string, url: string, size: number}>>().default([]),
  hints: json("hints").$type<Array<{text: string, cost: number}>>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const submissions = mysqlTable("submissions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  challengeId: varchar("challenge_id", { length: 36 }).notNull().references(() => challenges.id),
  flagAttempt: text("flag_attempt").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const solves = mysqlTable("solves", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  challengeId: varchar("challenge_id", { length: 36 }).notNull().references(() => challenges.id),
  solvedAt: timestamp("solved_at").defaultNow(),
});

export const achievements = mysqlTable("achievements", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAchievements = mysqlTable("user_achievements", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  achievementId: varchar("achievement_id", { length: 36 }).notNull().references(() => achievements.id),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export const hintUsage = mysqlTable("hint_usage", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  challengeId: varchar("challenge_id", { length: 36 }).notNull().references(() => challenges.id),
  hintIndex: int("hint_index").notNull(),
  pointsDeducted: int("points_deducted").notNull(),
  usedAt: timestamp("used_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  challenges: many(challenges),
  submissions: many(submissions),
  solves: many(solves),
  achievements: many(userAchievements),
  hintUsage: many(hintUsage),
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  creator: one(users, {
    fields: [challenges.creatorId],
    references: [users.id],
  }),
  submissions: many(submissions),
  solves: many(solves),
  hintUsage: many(hintUsage),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
  challenge: one(challenges, {
    fields: [submissions.challengeId],
    references: [challenges.id],
  }),
}));

export const solvesRelations = relations(solves, ({ one }) => ({
  user: one(users, {
    fields: [solves.userId],
    references: [users.id],
  }),
  challenge: one(challenges, {
    fields: [solves.challengeId],
    references: [challenges.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  users: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

export const hintUsageRelations = relations(hintUsage, ({ one }) => ({
  user: one(users, {
    fields: [hintUsage.userId],
    references: [users.id],
  }),
  challenge: one(challenges, {
    fields: [hintUsage.challengeId],
    references: [challenges.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
  slug: true,
  flagHash: true,
  flagSalt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  flag: z.string().min(1),
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submittedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;
export type Solve = typeof solves.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type HintUsage = typeof hintUsage.$inferSelect;
