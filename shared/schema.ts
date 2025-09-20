import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  boolean, 
  timestamp,
  jsonb
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  score: integer("score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  points: integer("points").notNull(),
  flagHash: text("flag_hash").notNull(),
  flagSalt: text("flag_salt").notNull(),
  published: boolean("published").default(false),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  artifacts: jsonb("artifacts").$type<Array<{name: string, url: string, size: number}>>().default([]),
  hints: jsonb("hints").$type<Array<{text: string, cost: number}>>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  challengeId: varchar("challenge_id").notNull().references(() => challenges.id),
  flagAttempt: text("flag_attempt").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const solves = pgTable("solves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  challengeId: varchar("challenge_id").notNull().references(() => challenges.id),
  solvedAt: timestamp("solved_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementId: varchar("achievement_id").notNull().references(() => achievements.id),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export const hintUsage = pgTable("hint_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  challengeId: varchar("challenge_id").notNull().references(() => challenges.id),
  hintIndex: integer("hint_index").notNull(),
  pointsDeducted: integer("points_deducted").notNull(),
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
