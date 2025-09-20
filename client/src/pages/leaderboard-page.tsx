import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Medal, Trophy, Users } from "lucide-react";

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard?limit=50");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-orange-400" />;
      default:
        return null;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank <= 3) {
      const colors = {
        1: "bg-yellow-500/20 text-yellow-400",
        2: "bg-gray-500/20 text-gray-400",
        3: "bg-orange-500/20 text-orange-400",
      };
      return colors[rank as keyof typeof colors];
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text terminal-cursor mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">Global rankings updated in real-time</p>
        </div>

        <Card className="neon-border overflow-hidden" data-testid="leaderboard">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Global Rankings
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{leaderboard?.length || 0} players</span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <Skeleton className="w-8 h-6" />
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {leaderboard?.map((user: any) => (
                  <div 
                    key={user.id} 
                    className={`p-4 hover:bg-muted/30 transition-colors ${
                      user.rank <= 3 ? 'bg-muted/20' : ''
                    }`}
                    data-testid={`row-user-${user.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 w-16">
                        <span 
                          className={`font-bold text-lg ${
                            user.rank <= 3 ? 'text-primary' : 'text-muted-foreground'
                          }`}
                          data-testid={`text-rank-${user.id}`}
                        >
                          #{user.rank}
                        </span>
                        {getRankIcon(user.rank)}
                      </div>
                      
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-medium truncate" 
                            data-testid={`text-username-${user.id}`}
                          >
                            {user.username}
                          </span>
                          {user.rank <= 3 && (
                            <Badge className={getRankBadge(user.rank)}>
                              {user.rank === 1 ? 'Champion' : user.rank === 2 ? 'Runner-up' : '3rd Place'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.solveCount} challenge{user.solveCount !== 1 ? 's' : ''} solved
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div 
                          className="text-primary font-bold text-lg" 
                          data-testid={`text-score-${user.id}`}
                        >
                          {user.score}
                        </div>
                        <div className="text-xs text-muted-foreground">points</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!isLoading && !leaderboard?.length && (
              <div className="p-8 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No players on the leaderboard yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
