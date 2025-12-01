import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { ChallengeCard } from "@/components/challenge-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trophy, Flag, Medal, Target, Globe } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

interface DashboardStats {
  totalScore: number;
  solvedCount: number;
  createdCount: number;
  globalRank: number;
}

export default function HomePage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (searchTerm) queryParams.append("search", searchTerm);
  if (selectedCategory !== "all") queryParams.append("category", selectedCategory);
  if (selectedDifficulty !== "all") queryParams.append("difficulty", selectedDifficulty);
  queryParams.append("published", "true");

  const { data: challenges, isLoading: challengesLoading } = useQuery({
    queryKey: ["/api/challenges", queryParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/challenges?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch challenges");
      return res.json();
    },
  });

  const { data: userStats } = useQuery({
    queryKey: ["/api/users", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/users/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch user stats");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: userChallenges } = useQuery({
    queryKey: ["/api/users", user?.id, "challenges"],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/users/${user.id}/challenges`);
      if (!res.ok) throw new Error("Failed to fetch user challenges");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: globalStats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch global stats");
      return res.json();
    },
  });

  const filteredChallenges = challenges?.filter((challenge: any) => {
    if (selectedStatus === "solved" && !challenge.hasSolved) return false;
    if (selectedStatus === "unsolved" && challenge.hasSolved) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Dashboard Stats */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6" data-testid="dashboard-stats">
          <Card className="neon-border hover-glow transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Score</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-total-score">
                    {userStats?.score || user?.score || 0}
                  </p>
                </div>
                <Trophy className="text-primary text-2xl" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="neon-border hover-glow transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Challenges Solved</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-solved-count">
                    {userStats?.solveCount || 0}
                  </p>
                </div>
                <Flag className="text-primary text-2xl" />
              </div>
            </CardContent>
          </Card>
          
          {user?.isAdmin && (
          <Card className="neon-border hover-glow transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Challenges Created</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-created-count">
                    {userChallenges?.length || 0}
                  </p>
                </div>
                <Plus className="text-primary text-2xl" />
              </div>
            </CardContent>
          </Card>
          )}
          
          <Card className="neon-border hover-glow transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Global Rank</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-global-rank">
                    #{userStats?.rank || 0}
                  </p>
                </div>
                <Medal className="text-primary text-2xl" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Global Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="neon-border hover-glow transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Global Progress</h3>
                <Globe className="text-primary text-2xl" />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-sm">Completion Rate</span>
                    <span className="text-2xl font-bold text-primary">{globalStats?.percentComplete || 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${globalStats?.percentComplete || 0}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">{globalStats?.totalSolvedPoints || 0}</span> / <span className="font-semibold text-primary">{globalStats?.totalAvailablePoints || 0}</span> points solved
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="neon-border hover-glow transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Competition Stats</h3>
                <Trophy className="text-primary text-2xl" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Challenges Solved</span>
                  <span className="text-2xl font-bold text-primary">{globalStats?.solvedCount || 0} / {globalStats?.totalCount || 0}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {globalStats?.totalCount} challenges available in total
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Challenge Browser */}
        <section className="space-y-6" data-testid="challenge-browser">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold gradient-text terminal-cursor">Challenges</h2>
            {user?.isAdmin && (
              <Link href="/create" data-testid="link-create-challenge">
                <Button className="hover-glow">
                  <Plus className="mr-2 h-4 w-4" />
                  New Challenge
                </Button>
              </Link>
            )}
          </div>
          
          {/* Search and Filters */}
          <Card className="neon-border">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Search challenges..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    data-testid="input-search"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-40" data-testid="select-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Cryptography">Cryptography</SelectItem>
                      <SelectItem value="Digital Forensics">Digital Forensics</SelectItem>
                      <SelectItem value="Threats">Threats</SelectItem>
                      <SelectItem value="Firewall & Network Security">Firewall & Network Security</SelectItem>
                      <SelectItem value="Sandbox & Virtualization">Sandbox & Virtualization</SelectItem>
                      <SelectItem value="Denial of Service">Denial of Service</SelectItem>
                      <SelectItem value="Consolidated Security Planning">Consolidated Security Planning</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger className="w-40" data-testid="select-difficulty">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-40" data-testid="select-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="unsolved">Unsolved</SelectItem>
                      <SelectItem value="solved">Solved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Challenges Grid */}
          {challengesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="neon-border">
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="challenges-grid">
              {filteredChallenges?.map((challenge: any) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
              {!filteredChallenges?.length && (
                <div className="col-span-full text-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No challenges found matching your filters.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
