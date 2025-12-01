import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ChallengePage from "@/pages/challenge-page";
import LeaderboardPage from "@/pages/leaderboard-page";
import CreateChallengePage from "@/pages/create-challenge-page";
import EditChallengePage from "@/pages/edit-challenge-page";
import AdminPage from "@/pages/admin-page";
import { AdminProtectedRoute } from "./lib/admin-protected-route";
import ProfilePage from "@/pages/profile-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
      <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/challenge/:id" component={ChallengePage} />
      <ProtectedRoute path="/leaderboard" component={LeaderboardPage} />
      <AdminProtectedRoute path="/create" component={CreateChallengePage} />
      <ProtectedRoute path="/challenge/:id/edit" component={EditChallengePage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <AdminProtectedRoute path="/admin" component={AdminPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
