import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, hashPassword, comparePasswords } from "./auth";
import multer from "multer";
import path from "path";
import { z } from "zod";
import { insertChallengeSchema, insertSubmissionSchema } from "@shared/schema";

// Rate limiting store (in-memory)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function rateLimit(req: any, res: any, next: any) {
  const key = `${req.user?.id || req.ip}:${req.path}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 10;

  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= maxAttempts) {
    return res.status(429).json({ 
      message: "Too many attempts. Please wait before trying again.",
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    });
  }

  current.count++;
  next();
}

// File upload configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      '.zip', '.tar', '.gz', '.txt', '.jpg', '.jpeg', '.png', '.pdf',
      '.py', '.c', '.cpp', '.js', '.html', '.css', '.md'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Challenge routes
  app.get("/api/challenges", async (req, res) => {
    try {
      const { category, difficulty, search, published } = req.query;
      const filters: any = {};
      
      if (category) filters.category = category as string;
      if (difficulty) filters.difficulty = difficulty as string;
      if (search) filters.search = search as string;
      if (published !== undefined) filters.published = published === 'true';
      
      // Show only published challenges to non-authenticated users
      if (!req.isAuthenticated()) {
        filters.published = true;
      }

      const challenges = await storage.getChallenges(filters);
      
      // Don't expose flag hash/salt
      const sanitizedChallenges = challenges.map(challenge => {
        const { flagHash, flagSalt, ...rest } = challenge;
        return rest;
      });
      
      res.json(sanitizedChallenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });

  app.get("/api/challenges/:id", async (req, res) => {
    try {
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }

      // Don't expose flag hash/salt
      const { flagHash, flagSalt, ...sanitizedChallenge } = challenge;
      
      // Check if user has solved this challenge
      let hasSolved = false;
      if (req.isAuthenticated()) {
        hasSolved = await storage.hasSolved(req.user!.id, challenge.id);
      }

      res.json({ ...sanitizedChallenge, hasSolved });
    } catch (error) {
      console.error("Error fetching challenge:", error);
      res.status(500).json({ message: "Failed to fetch challenge" });
    }
  });

  app.post("/api/challenges", requireAuth, upload.array('files'), async (req, res) => {
    try {
      const challengeData = insertChallengeSchema.parse({
        ...req.body,
        creatorId: req.user!.id,
        points: parseInt(req.body.points),
        published: req.body.published === 'true'
      });

      // Process uploaded files
      const files = req.files as Express.Multer.File[];
      const artifacts = files?.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        size: file.size
      })) || [];

      const challenge = await storage.createChallenge({
        ...challengeData,
        artifacts
      });

      res.status(201).json(challenge);
    } catch (error) {
      console.error("Error creating challenge:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid challenge data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create challenge" });
    }
  });

  app.put("/api/challenges/:id", requireAuth, async (req, res) => {
    try {
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }

      // Check if user owns this challenge
      if (challenge.creatorId !== req.user!.id) {
        return res.status(403).json({ message: "You can only edit your own challenges" });
      }

      const updatedChallenge = await storage.updateChallenge(req.params.id, req.body);
      res.json(updatedChallenge);
    } catch (error) {
      console.error("Error updating challenge:", error);
      res.status(500).json({ message: "Failed to update challenge" });
    }
  });

  app.delete("/api/challenges/:id", requireAuth, async (req, res) => {
    try {
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }

      // Check if user owns this challenge
      if (challenge.creatorId !== req.user!.id) {
        return res.status(403).json({ message: "You can only delete your own challenges" });
      }

      await storage.deleteChallenge(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting challenge:", error);
      res.status(500).json({ message: "Failed to delete challenge" });
    }
  });

  // Flag submission
  app.post("/api/challenges/:id/submit", requireAuth, rateLimit, async (req, res) => {
    try {
      const { flag } = req.body;
      const challengeId = req.params.id;
      const userId = req.user!.id;

      if (!flag) {
        return res.status(400).json({ message: "Flag is required" });
      }

      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }

      if (!challenge.published) {
        return res.status(400).json({ message: "Challenge is not published" });
      }

      // Check if already solved
      const alreadySolved = await storage.hasSolved(userId, challengeId);
      if (alreadySolved) {
        return res.status(400).json({ message: "You have already solved this challenge" });
      }

      // Check flag
      const isCorrect = await comparePasswords(flag, challenge.flagHash);

      // Log submission
      await storage.createSubmission({
        userId,
        challengeId,
        flagAttempt: flag,
        isCorrect,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
      });

      if (isCorrect) {
        // Create solve record
        await storage.createSolve(userId, challengeId);
        
        // Update user score
        await storage.updateUserScore(userId, challenge.points);

        res.json({ correct: true, message: "Congratulations! Flag accepted." });
      } else {
        res.json({ correct: false, message: "Incorrect flag. Try again!" });
      }
    } catch (error) {
      console.error("Error submitting flag:", error);
      res.status(500).json({ message: "Failed to submit flag" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      const rank = await storage.getUserRank(user.id);
      const solves = await storage.getUserSolves(user.id);
      const achievements = await storage.getUserAchievements(user.id);

      res.json({
        ...userWithoutPassword,
        rank,
        solveCount: solves.length,
        achievements
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/users/:id/challenges", async (req, res) => {
    try {
      const challenges = await storage.getUserChallenges(req.params.id);
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching user challenges:", error);
      res.status(500).json({ message: "Failed to fetch user challenges" });
    }
  });

  app.get("/api/users/:id/solves", async (req, res) => {
    try {
      const solves = await storage.getUserSolves(req.params.id);
      res.json(solves);
    } catch (error) {
      console.error("Error fetching user solves:", error);
      res.status(500).json({ message: "Failed to fetch user solves" });
    }
  });

  // Leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const leaderboard = await storage.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Hint usage
  app.post("/api/challenges/:id/hints/:index", requireAuth, async (req, res) => {
    try {
      const challengeId = req.params.id;
      const hintIndex = parseInt(req.params.index);
      const userId = req.user!.id;

      const challenge = await storage.getChallenge(challengeId);
      if (!challenge || !challenge.hints || !challenge.hints[hintIndex]) {
        return res.status(404).json({ message: "Hint not found" });
      }

      // Check if hint already used
      const existingUsage = await storage.getUserHintUsage(userId, challengeId);
      if (existingUsage.some(usage => usage.hintIndex === hintIndex)) {
        return res.status(400).json({ message: "Hint already used" });
      }

      const hint = challenge.hints[hintIndex];
      
      // Deduct points and log usage
      await storage.updateUserScore(userId, -hint.cost);
      await storage.useHint(userId, challengeId, hintIndex, hint.cost);

      res.json({ hint: hint.text, cost: hint.cost });
    } catch (error) {
      console.error("Error using hint:", error);
      res.status(500).json({ message: "Failed to use hint" });
    }
  });

  // File downloads
  app.get("/uploads/:filename", (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(process.cwd(), 'uploads', filename);
    
    res.download(filepath, (err) => {
      if (err) {
        res.status(404).json({ message: "File not found" });
      }
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
