# Go Server for 0XCTF25

This is a unified Go server that consolidates the Vite frontend and Express API into a single binary.

## Features

- **Single Binary**: Combines frontend + backend into one executable
- **Vite Integration**: Serves pre-built Vite static files from `dist/public`
- **Express API Routes**: All `/api/*` routes work the same way
- **Session Management**: PostgreSQL-backed sessions (via `connect-pg-simple`)
- **File Uploads**: Handles file uploads to `/uploads` directory
- **Request Logging**: API request logging similar to Express version

## Usage

### Development

```bash
# Build the frontend, then run Go server
npm run build
npm run dev:go

# Or in one command
npm run build:go
npm run start:go
```

The server runs on `http://localhost:5000` by default.

### Production

```bash
# Build frontend + Go binary
npm run build:go

# Run the compiled binary
npm run start:go
```

## Environment Variables

Required:
- `DATABASE_URL`: PostgreSQL connection string (same as Express version)
- `SESSION_SECRET`: Session encryption key (same as Express version)
- `PORT` (optional): Port to serve on (defaults to 5000)

Example from your `.env`:
```
DATABASE_URL=postgresql://postgres:password@db.example.com:5432/postgres
SESSION_SECRET=your-secret-key-change-this-in-production-12345678901234567890
```

## Architecture

```
main.go
├── Routes
│   ├── GET /api/challenges
│   ├── GET /api/challenges/:id
│   ├── POST /api/challenges
│   ├── PUT /api/challenges/:id
│   ├── DELETE /api/challenges/:id
│   ├── POST /api/challenges/:id/submit
│   ├── GET /api/users/:id
│   ├── POST /api/register
│   ├── POST /api/login
│   ├── POST /api/logout
│   └── ...
├── Static Files
│   └── Serves dist/public/* (Vite-built files)
└── Middleware
    └── Request logging
```

## Implementation Status

### ✅ Completed
- Route structure and request routing
- Static file serving from `dist/public`
- Request logging middleware
- Automatic `index.html` serving for client-side routing
- Content-type detection for static assets
- Directory traversal protection for `/uploads`

### 🔲 TODO - Database Integration
These routes need implementation with PostgreSQL:

**Authentication**
- [ ] `POST /api/register` - User registration with password hashing
- [ ] `POST /api/login` - Login with session creation
- [ ] `POST /api/logout` - Logout and session cleanup
- [ ] `GET /api/me` - Get current user from session

**Challenges**
- [ ] `GET /api/challenges` - List challenges with filters
- [ ] `GET /api/challenges/:id` - Get challenge details
- [ ] `POST /api/challenges` - Create challenge (auth required)
- [ ] `PUT /api/challenges/:id` - Update challenge (auth + ownership check)
- [ ] `DELETE /api/challenges/:id` - Delete challenge (auth + ownership check)

**Flag Submission**
- [ ] `POST /api/challenges/:id/submit` - Submit flag with rate limiting and validation

**Users**
- [ ] `GET /api/users/:id` - Get user profile
- [ ] `GET /api/users/:id/challenges` - Get user's created challenges
- [ ] `GET /api/users/:id/solves` - Get user's solved challenges

**Leaderboard**
- [ ] `GET /api/leaderboard` - Get ranked users by score

**Hints**
- [ ] `POST /api/challenges/:id/hints/:index` - Use hint (deduct points)

### 🔲 TODO - Session Management
- [ ] PostgreSQL session store (like `connect-pg-simple`)
- [ ] Cookie-based session middleware
- [ ] Authentication middleware for protected routes

## Building a Full Implementation

To complete this server, you'll need:

1. **Database driver**: `github.com/lib/pq` (already in go.mod)
2. **Session store**: Consider using [github.com/rbcervilla/redisstore](https://github.com/rbcervilla/redisstore) or implement PostgreSQL store
3. **Password hashing**: Use Go's `crypto/scrypt` (built-in, similar to Express version)
4. **Request parsing**: Use `json.NewDecoder` for request bodies
5. **Authentication middleware**: Check session cookies before executing handlers

Example implementation pattern for a protected route:

```go
func handleCreateChallenge(w http.ResponseWriter, r *http.Request) {
    // 1. Check authentication via session
    userID, err := getUserFromSession(r)
    if err != nil {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"message": "Unauthorized"})
        return
    }
    
    // 2. Parse request body
    var req ChallengeRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        return
    }
    
    // 3. Validate input
    if err := validateChallenge(req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"message": err.Error()})
        return
    }
    
    // 4. Execute database operation
    challenge, err := db.CreateChallenge(userID, req)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        return
    }
    
    // 5. Return response
    w.WriteHeader(http.StatusCreated)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(challenge)
}
```

## Comparison: Express vs Go Server

| Feature | Express | Go Server |
|---------|---------|-----------|
| Routes | TypeScript + Express | Go http.ServeMux |
| Database | Drizzle ORM | Direct pq driver (to implement) |
| Sessions | connect-pg-simple | PostgreSQL store (to implement) |
| Static Files | Vite dev server middleware | File serving from dist/public |
| Binary Size | ~200MB (node_modules) | ~10-15MB (single binary) |
| Runtime | Node.js + V8 | Native Go |

## Next Steps

1. Add PostgreSQL session middleware
2. Implement `database.go` with CRUD operations
3. Add authentication helpers
4. Implement each route handler
5. Add rate limiting for flag submissions
6. Test all routes against your database schema
