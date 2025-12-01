import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, 
  Trophy, 
  Flag, 
  Calendar, 
  Medal, 
  Flame, 
  Brain, 
  Crown,
  Edit,
  Trash2,
  Plus,
  Check
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/users", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/users/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch user stats");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: userChallenges, isLoading: challengesLoading } = useQuery({
    queryKey: ["/api/users", user?.id, "challenges"],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/users/${user.id}/challenges`);
      if (!res.ok) throw new Error("Failed to fetch user challenges");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: userSolves, isLoading: solvesLoading } = useQuery({
    queryKey: ["/api/users", user?.id, "solves"],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/users/${user.id}/solves`);
      if (!res.ok) throw new Error("Failed to fetch user solves");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      await apiRequest("DELETE", `/api/challenges/${challengeId}`);
    },
    onSuccess: () => {
      toast({
        title: "Challenge Deleted",
        description: "Challenge has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "challenges"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteChallenge = (challengeId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      deleteMutation.mutate(challengeId);
    }
  };

  // Mock achievements data - in a real app this would come from the API
  const achievements = [
    { id: 1, name: "First Blood", description: "First to solve a challenge", icon: "medal", unlocked: true },
    { id: 2, name: "Speed Demon", description: "Solve a challenge in under 5 minutes", icon: "fire", unlocked: true },
    { id: 3, name: "No Hint Hero", description: "Solve a challenge without using hints", icon: "brain", unlocked: true },
    { id: 4, name: "Century Club", description: "Solve 100 challenges", icon: "trophy", unlocked: false },
  ];

  const getAchievementIcon = (icon: string, unlocked: boolean) => {
    const className = `text-xl mb-2 ${unlocked ? 'text-yellow-400' : 'text-muted-foreground'}`;
    switch (icon) {
      case 'medal': return <Medal className={className} />;
      case 'fire': return <Flame className={className} />;
      case 'brain': return <Brain className={className} />;
      case 'trophy': return <Trophy className={className} />;
      default: return <Medal className={className} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text terminal-cursor mb-2">Profile</h1>
          <p className="text-muted-foreground">Your CTF journey and achievements</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Profile Info */}
          <Card className="neon-border" data-testid="profile-info">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {user?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold" data-testid="text-username">{user?.username}</h3>
                <p className="text-muted-foreground" data-testid="text-email">{user?.email}</p>
              </div>
              
              <div className="space-y-4">
                {statsLoading ? (
                  <>
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Global Rank</span>
                      <span className="text-primary font-bold" data-testid="text-global-rank">
                        #{userStats?.rank || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Score</span>
                      <span className="text-primary font-bold" data-testid="text-total-score">
                        {userStats?.score || user?.score || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member Since</span>
                      <span data-testid="text-join-date">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Achievements */}
          <Card className="neon-border" data-testid="achievements">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary">Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {achievements.map((achievement) => (
                  <div 
                    key={achievement.id}
                    className={`bg-muted p-3 rounded-md text-center hover-glow transition-all duration-200 ${
                      !achievement.unlocked ? 'opacity-50' : ''
                    }`}
                    data-testid={`achievement-${achievement.id}`}
                  >
                    {getAchievementIcon(achievement.icon, achievement.unlocked)}
                    <p className={`text-xs font-medium ${
                      achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {achievement.name}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Activity */}
          <Card className="neon-border" data-testid="recent-activity">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {solvesLoading ? (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <Skeleton className="w-4 h-4" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    ))}
                  </>
                ) : userSolves?.slice(0, 5).map((solve: any, index: number) => (
                  <div key={solve.id} className="flex items-center gap-3 text-sm" data-testid={`activity-${index}`}>
                    <Flag className="w-4 h-4 text-green-400" />
                    <div className="flex-1">
                      <p>Solved <span className="text-primary">{solve.challenge.title}</span></p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(solve.solvedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-4">
                    <Flag className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Created Challenges */}
        {user?.isAdmin && (
        <Card className="neon-border overflow-hidden" data-testid="created-challenges">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-primary">My Challenges</CardTitle>
              <Button 
                size="sm" 
                className="hover-glow" 
                onClick={() => setLocation("/create")}
                data-testid="button-create-new"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create New
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {challengesLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Title</th>
                      <th className="text-left p-4 font-semibold">Category</th>
                      <th className="text-left p-4 font-semibold">Solves</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {userChallenges?.map((challenge: any) => (
                      <tr 
                        key={challenge.id} 
                        className="hover:bg-muted/30 transition-colors"
                        data-testid={`challenge-row-${challenge.id}`}
                      >
                        <td className="p-4">
                          <span className="font-medium" data-testid={`text-challenge-title-${challenge.id}`}>
                            {challenge.title}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="text-xs">
                            {challenge.category}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground" data-testid={`text-solve-count-${challenge.id}`}>
                          {challenge.solveCount}
                        </td>
                        <td className="p-4">
                          <Badge 
                            className={challenge.published 
                              ? "bg-green-500/20 text-green-400" 
                              : "bg-yellow-500/20 text-yellow-400"
                            }
                          >
                            {challenge.published ? "Published" : "Draft"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-primary hover:text-secondary"
                              onClick={() => setLocation(`/challenge/${challenge.id}/edit`)}
                              data-testid={`button-edit-${challenge.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-red-400"
                              onClick={() => handleDeleteChallenge(challenge.id, challenge.title)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${challenge.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )) || []}
                  </tbody>
                </table>
                
                {!challengesLoading && !userChallenges?.length && (
                  <div className="p-8 text-center">
                    <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">You haven't created any challenges yet.</p>
                    <Button 
                      className="mt-4 hover-glow" 
                      onClick={() => setLocation("/create")}
                      data-testid="button-create-first"
                    >
                      Create Your First Challenge
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </main>
    </div>
  );
}
