import {
  users,
  challenges,
  submissions,
  solves,
  achievements,
  userAchievements,
  hintUsage,
  type User,
  type InsertUser,
  type Challenge,
  type InsertChallenge,
  type Submission,
  type InsertSubmission,
  type Solve,
  type Achievement,
  type UserAchievement,
  type HintUsage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, and, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { hashPassword } from "./auth";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserScore(userId: string, points: number): Promise<void>;

  // Challenge operations
  getChallenges(filters?: {
    category?: string;
    difficulty?: string;
    published?: boolean;
    search?: string;
  }): Promise<(Challenge & { creator: User; solveCount: number })[]>;
  getChallenge(id: string): Promise<Challenge | undefined>;
  getChallengeBySlug(slug: string): Promise<Challenge | undefined>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  updateChallenge(id: string, challenge: Partial<Challenge>): Promise<Challenge>;
  deleteChallenge(id: string): Promise<void>;
  getUserChallenges(userId: string): Promise<(Challenge & { solveCount: number })[]>;

  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionCount(userId: string, challengeId: string, timeWindow: number): Promise<number>;

  // Solve operations
  createSolve(userId: string, challengeId: string): Promise<Solve>;
  getUserSolves(userId: string): Promise<(Solve & { challenge: Challenge })[]>;
  hasSolved(userId: string, challengeId: string): Promise<boolean>;

  // Leaderboard operations
  getLeaderboard(limit?: number): Promise<Array<User & { rank: number; solveCount: number }>>;
  getUserRank(userId: string): Promise<number>;

  // Achievement operations
  getAchievements(): Promise<Achievement[]>;
  getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]>;
  unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement>;

  // Hint operations
  useHint(userId: string, challengeId: string, hintIndex: number, pointsDeducted: number): Promise<HintUsage>;
  getUserHintUsage(userId: string, challengeId: string): Promise<HintUsage[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await db
      .insert(users)
      .values(insertUser);
    const [user] = await db.select().from(users).where(eq(users.email, insertUser.email));
    return user;
  }

  async updateUserScore(userId: string, points: number): Promise<void> {
    await db
      .update(users)
      .set({ score: sql`${users.score} + ${points}` })
      .where(eq(users.id, userId));
  }

  async getChallenges(filters?: {
    category?: string;
    difficulty?: string;
    published?: boolean;
    search?: string;
  }): Promise<(Challenge & { creator: User; solveCount: number })[]> {
    const baseQuery = db
      .select({
        challenge: challenges,
        creator: users,
        solveCount: count(solves.id),
      })
      .from(challenges)
      .leftJoin(users, eq(challenges.creatorId, users.id))
      .leftJoin(solves, eq(challenges.id, solves.challengeId))
      .groupBy(challenges.id, users.id);

    const conditions = [];
    
    if (filters?.published !== undefined) {
      conditions.push(eq(challenges.published, filters.published));
    }
    
    if (filters?.category) {
      conditions.push(eq(challenges.category, filters.category));
    }
    
    if (filters?.difficulty) {
      conditions.push(eq(challenges.difficulty, filters.difficulty));
    }
    
    if (filters?.search) {
      conditions.push(
        sql`${challenges.title} ILIKE ${`%${filters.search}%`} OR ${challenges.description} ILIKE ${`%${filters.search}%`}`
      );
    }

    const result = conditions.length > 0 
      ? await baseQuery.where(and(...conditions)).orderBy(desc(challenges.createdAt))
      : await baseQuery.orderBy(desc(challenges.createdAt));
    
    return result.map(row => ({
      ...row.challenge,
      creator: row.creator!,
      solveCount: Number(row.solveCount),
    }));
  }

  async getChallenge(id: string): Promise<Challenge | undefined> {
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, id));
    return challenge || undefined;
  }

  async getChallengeBySlug(slug: string): Promise<Challenge | undefined> {
    const [challenge] = await db.select().from(challenges).where(eq(challenges.slug, slug));
    return challenge || undefined;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + randomBytes(4).toString('hex');
  }

  async createChallenge(insertChallenge: InsertChallenge): Promise<Challenge> {
    const { flag, ...challengeData } = insertChallenge;
    
    // Hash the flag
    const salt = randomBytes(16).toString('hex');
    const flagHash = await hashPassword(flag);
    
    const slug = this.generateSlug(challengeData.title);

    const payload = {
      ...challengeData,
      slug,
      flagHash,
      flagSalt: salt,
    };

    await db
      .insert(challenges)
      .values(payload);
    
    const [challenge] = await db.select().from(challenges).where(eq(challenges.slug, slug));
    return challenge;
  }

  async updateChallenge(id: string, challengeUpdate: Partial<Challenge>): Promise<Challenge> {
    await db
      .update(challenges)
      .set({ ...challengeUpdate, updatedAt: new Date() })
      .where(eq(challenges.id, id));
    
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, id));
    return challenge;
  }

  async deleteChallenge(id: string): Promise<void> {
    await db.delete(challenges).where(eq(challenges.id, id));
  }

  async getUserChallenges(userId: string): Promise<(Challenge & { solveCount: number })[]> {
    const result = await db
      .select({
        challenge: challenges,
        solveCount: count(solves.id),
      })
      .from(challenges)
      .leftJoin(solves, eq(challenges.id, solves.challengeId))
      .where(eq(challenges.creatorId, userId))
      .groupBy(challenges.id)
      .orderBy(desc(challenges.createdAt));

    return result.map(row => ({
      ...row.challenge,
      solveCount: Number(row.solveCount),
    }));
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    await db
      .insert(submissions)
      .values(submission);
    
    const [newSubmission] = await db.select().from(submissions).where(eq(submissions.userId, submission.userId)).orderBy(desc(submissions.submittedAt));
    return newSubmission;
  }

  async getSubmissionCount(userId: string, challengeId: string, timeWindow: number): Promise<number> {
    const timeThreshold = new Date(Date.now() - timeWindow);
    
    const [result] = await db
      .select({ count: count() })
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, userId),
          eq(submissions.challengeId, challengeId),
          sql`${submissions.submittedAt} > ${timeThreshold}`
        )
      );
    
    return Number(result.count);
  }

  async createSolve(userId: string, challengeId: string): Promise<Solve> {
    await db
      .insert(solves)
      .values({ userId, challengeId });
    
    const [solve] = await db.select().from(solves).where(and(eq(solves.userId, userId), eq(solves.challengeId, challengeId))).orderBy(desc(solves.solvedAt));
    return solve;
  }

  async getUserSolves(userId: string): Promise<(Solve & { challenge: Challenge })[]> {
    const result = await db
      .select({
        solve: solves,
        challenge: challenges,
      })
      .from(solves)
      .leftJoin(challenges, eq(solves.challengeId, challenges.id))
      .where(eq(solves.userId, userId))
      .orderBy(desc(solves.solvedAt));

    return result.map(row => ({
      ...row.solve,
      challenge: row.challenge!,
    }));
  }

  async hasSolved(userId: string, challengeId: string): Promise<boolean> {
    const [solve] = await db
      .select()
      .from(solves)
      .where(and(eq(solves.userId, userId), eq(solves.challengeId, challengeId)));
    
    return !!solve;
  }

  async getLeaderboard(limit = 50): Promise<Array<User & { rank: number; solveCount: number }>> {
    const result = await db
      .select({
        user: users,
        solveCount: count(solves.id),
      })
      .from(users)
      .leftJoin(solves, eq(users.id, solves.userId))
      .where(eq(users.isAdmin, false))
      .groupBy(users.id)
      .orderBy(desc(users.score), desc(count(solves.id)))
      .limit(limit);

    return result.map((row, index) => ({
      ...row.user,
      rank: index + 1,
      solveCount: Number(row.solveCount),
    }));
  }

  async getUserRank(userId: string): Promise<number> {
    const user = await this.getUser(userId);
    if (!user) return 0;

    const [result] = await db
      .select({ rank: count() })
      .from(users)
      .where(sql`${users.score} > ${user.score}`);

    return Number(result.rank) + 1;
  }

  async getAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements);
  }

  async getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]> {
    const result = await db
      .select({
        userAchievement: userAchievements,
        achievement: achievements,
      })
      .from(userAchievements)
      .leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.unlockedAt));

    return result.map(row => ({
      ...row.userAchievement,
      achievement: row.achievement!,
    }));
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    await db
      .insert(userAchievements)
      .values({ userId, achievementId });
    
    const [userAchievement] = await db.select().from(userAchievements).where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId))).orderBy(desc(userAchievements.unlockedAt));
    return userAchievement;
  }

  async useHint(userId: string, challengeId: string, hintIndex: number, pointsDeducted: number): Promise<HintUsage> {
    await db
      .insert(hintUsage)
      .values({ userId, challengeId, hintIndex, pointsDeducted });
    
    const [hint] = await db.select().from(hintUsage).where(and(eq(hintUsage.userId, userId), eq(hintUsage.challengeId, challengeId))).orderBy(desc(hintUsage.usedAt));
    return hint;
  }

  async getUserHintUsage(userId: string, challengeId: string): Promise<HintUsage[]> {
    return await db
      .select()
      .from(hintUsage)
      .where(and(eq(hintUsage.userId, userId), eq(hintUsage.challengeId, challengeId)));
  }
}

export const storage = new DatabaseStorage();
