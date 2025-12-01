package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

const defaultPort = "5000"

var (
	uploadDir = "uploads"
	publicDir = "dist/public"
	pidFile   = ".server.pid"
)

func init() { _ = os.MkdirAll(uploadDir, 0755) }

func main() {
	portStr := os.Getenv("PORT")
	if portStr == "" {
		portStr = defaultPort
	}

	if os.Getenv("DATABASE_URL") == "" {
		log.Println("warning: DATABASE_URL is not set")
	}
	if os.Getenv("SESSION_SECRET") == "" {
		log.Println("warning: SESSION_SECRET is not set")
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/challenges", handleChallenges)
	mux.HandleFunc("/api/challenges/", handleChallengeByID)
	mux.HandleFunc("/api/users/", handleUserByID)
	mux.HandleFunc("/api/leaderboard", handleGetLeaderboard)
	mux.HandleFunc("/uploads/", handleDownloadFile)
	mux.HandleFunc("/api/register", handleRegister)
	mux.HandleFunc("/api/login", handleLogin)
	mux.HandleFunc("/api/logout", handleLogout)
	mux.HandleFunc("/api/me", handleGetMe)
	mux.HandleFunc("/", serveStaticOrNotFound)

	srv := &http.Server{Handler: loggingMiddleware(mux)}

	basePort, err := strconv.Atoi(portStr)
	if err != nil || basePort <= 0 {
		basePort, _ = strconv.Atoi(defaultPort)
	}
	const maxAttempts = 10
	var ln net.Listener
	var listenPort int
	for i := 0; i < maxAttempts; i++ {
		tryPort := basePort + i
		addr := fmt.Sprintf(":%d", tryPort)
		ln, err = net.Listen("tcp", addr)
		if err == nil {
			listenPort = tryPort
			break
		}
		if strings.Contains(err.Error(), "address already in use") {
			continue
		}
		log.Fatalf("failed to listen on %s: %v", addr, err)
	}
	if ln == nil {
		log.Fatalf("unable to bind to any port starting at %d", basePort)
	}

	if err := writePID(pidFile); err != nil {
		log.Printf("warning: failed to write pid file: %v", err)
	}

	serverErr := make(chan error, 1)
	go func() {
		fmt.Printf("serving on http://localhost:%d\n", listenPort)
		if err := srv.Serve(ln); err != nil && err != http.ErrServerClosed {
			serverErr <- err
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	select {
	case sig := <-stop:
		log.Printf("signal received: %v, shutting down", sig)
	case err := <-serverErr:
		log.Fatalf("server error: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("graceful shutdown failed: %v", err)
	}

	if err := removePID(pidFile); err != nil {
		log.Printf("warning: failed to remove pid file: %v", err)
	}
	log.Println("server stopped")
}

func writePID(path string) error {
	pid := os.Getpid()
	return os.WriteFile(path, []byte(strconv.Itoa(pid)), 0644)
}
func removePID(path string) error { _ = os.Remove(path); return nil }

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		path := r.URL.Path
		rec := &responseRecorder{ResponseWriter: w, statusCode: 200, body: &strings.Builder{}}
		next.ServeHTTP(rec, r)
		dur := time.Since(start).Milliseconds()
		if strings.HasPrefix(path, "/api") {
			line := fmt.Sprintf("%s %s %d in %dms", r.Method, path, rec.statusCode, dur)
			if rec.body.Len() > 0 && rec.statusCode < 400 {
				b := rec.body.String()
				if len(b) > 200 {
					b = b[:200] + "…"
				}
				line += fmt.Sprintf(" :: %s", b)
			}
			log.Println(line)
		}
	})
}

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
	body       *strings.Builder
}

func (r *responseRecorder) WriteHeader(s int) { r.statusCode = s; r.ResponseWriter.WriteHeader(s) }
func (r *responseRecorder) Write(b []byte) (int, error) {
	r.body.Write(b)
	return r.ResponseWriter.Write(b)
}

func handleChallenges(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
	case http.MethodPost:
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"message": "created"})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}
func handleChallengeByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/challenges/")
	if id == "" {
		http.NotFound(w, r)
		return
	}
	if strings.HasSuffix(id, "/submit") {
		id = strings.TrimSuffix(id, "/submit")
		if r.Method == http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{"correct": false})
			return
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"id": id})
}
func handleUserByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/users/")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"id": id})
}
func handleGetLeaderboard(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode([]interface{}{})
}
func handleDownloadFile(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimPrefix(r.URL.Path, "/uploads/")
	if strings.Contains(name, "..") || strings.Contains(name, "/") {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	http.ServeFile(w, r, filepath.Join(uploadDir, name))
}
func handleRegister(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "registered"})
}
func handleLogin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "logged-in"})
}
func handleLogout(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }
func handleGetMe(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "unauthorized", http.StatusUnauthorized)
}

func serveStaticOrNotFound(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Path
	if strings.HasPrefix(p, "/api/") || strings.HasPrefix(p, "/uploads/") {
		http.NotFound(w, r)
		return
	}
	rel := strings.TrimPrefix(p, "/")
	if rel == "" {
		rel = "index.html"
	}
	fp := filepath.Join(publicDir, filepath.Clean(rel))
	if stat, err := os.Stat(fp); err == nil && !stat.IsDir() {
		http.ServeFile(w, r, fp)
		return
	}
	idx := filepath.Join(publicDir, "index.html")
	if stat, err := os.Stat(idx); err == nil && !stat.IsDir() {
		http.ServeFile(w, r, idx)
		return
	}
	http.NotFound(w, r)
}

func isAuthenticated(r *http.Request) bool { return false }
