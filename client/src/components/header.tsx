import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    { path: "/", label: "Challenges" },
    { path: "/leaderboard", label: "Leaderboard" },
    // Create is admin-only; we'll conditionally render it below when user.isAdmin is true
    { path: "/create", label: "Create", adminOnly: true },
    { path: "/profile", label: "Profile" },
  ];

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50" data-testid="header">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" data-testid="link-home">
              <h1 className="text-2xl font-bold gradient-text cursor-pointer">0XCTF25</h1>
            </Link>
            <span className="text-muted-foreground text-sm">// secure.community.driven</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => {
              if ((item as any).adminOnly && !user?.isAdmin) return null;
              return (
                <Link key={item.path} href={item.path} data-testid={`link-nav-${item.label.toLowerCase()}`}>
                  <span 
                    className={`hover:text-primary transition-colors cursor-pointer ${
                      location === item.path ? 'text-primary' : ''
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
          
          {user && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-muted px-3 py-2 rounded-md neon-border" data-testid="user-info">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm" data-testid="text-username">{user.username}</span>
                <span className="text-primary font-mono text-xs" data-testid="text-score">{user.score}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="hover-glow"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
