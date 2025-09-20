import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Flag, User, Clock, HelpCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ChallengePage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [flagInput, setFlagInput] = useState("");

  const { data: challenge, isLoading } = useQuery({
    queryKey: ["/api/challenges", id],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${id}`);
      if (!res.ok) throw new Error("Failed to fetch challenge");
      return res.json();
    },
    enabled: !!id,
  });

  const submitFlagMutation = useMutation({
    mutationFn: async (flag: string) => {
      const res = await apiRequest("POST", `/api/challenges/${id}/submit`, { flag });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.correct) {
        toast({
          title: "Correct Flag! 🎉",
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        setFlagInput("");
      } else {
        toast({
          title: "Incorrect Flag",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitFlag = () => {
    if (!flagInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a flag",
        variant: "destructive",
      });
      return;
    }
    submitFlagMutation.mutate(flagInput);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="neon-border">
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="neon-border">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold text-destructive mb-4">Challenge Not Found</h1>
              <p className="text-muted-foreground">The challenge you're looking for doesn't exist.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const difficultyColors = {
    Easy: "bg-green-500/20 text-green-400",
    Medium: "bg-orange-500/20 text-orange-400",
    Hard: "bg-red-500/20 text-red-400",
    Insane: "bg-purple-500/20 text-purple-400",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Card className="neon-border" data-testid="challenge-detail">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl gradient-text" data-testid="text-challenge-title">
                {challenge.title}
              </CardTitle>
              {challenge.hasSolved && (
                <Badge className="bg-green-500 text-black">
                  ✓ SOLVED
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4 flex-wrap mt-4">
              <Badge variant="secondary" data-testid="badge-category">
                {challenge.category}
              </Badge>
              <Badge 
                className={difficultyColors[challenge.difficulty as keyof typeof difficultyColors] || 'bg-muted'}
                data-testid="badge-difficulty"
              >
                {challenge.difficulty}
              </Badge>
              <span className="text-primary font-bold text-lg" data-testid="text-points">
                {challenge.points} points
              </span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="w-4 h-4" />
                <span data-testid="text-creator">{challenge.creator?.username}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span data-testid="text-created">
                  {new Date(challenge.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-primary mb-3">Description</h3>
              <div className="prose prose-invert max-w-none" data-testid="challenge-description">
                <ReactMarkdown>{challenge.description}</ReactMarkdown>
              </div>
            </div>
            
            {/* Files */}
            {challenge.artifacts && challenge.artifacts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-primary mb-3">Files</h3>
                <div className="space-y-2">
                  {challenge.artifacts.map((file: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-3 rounded-md">
                      <div className="flex items-center gap-3">
                        <Download className="w-4 h-4 text-primary" />
                        <span data-testid={`text-filename-${index}`}>{file.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        className="hover-glow"
                        onClick={() => window.open(file.url, '_blank')}
                        data-testid={`button-download-${index}`}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Flag Submission */}
            {!challenge.hasSolved && (
              <div>
                <h3 className="text-lg font-semibold text-primary mb-3">Submit Flag</h3>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="flag{...}"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    className="flex-1 font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitFlag()}
                    data-testid="input-flag"
                  />
                  <Button
                    onClick={handleSubmitFlag}
                    disabled={submitFlagMutation.isPending || !flagInput.trim()}
                    className="hover-glow"
                    data-testid="button-submit-flag"
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    {submitFlagMutation.isPending ? "Submitting..." : "Submit"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Rate limited: 10 submissions per minute
                </p>
              </div>
            )}
            
            {/* Hints */}
            {challenge.hints && challenge.hints.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-primary mb-3">Hints</h3>
                <div className="space-y-2">
                  {challenge.hints.map((hint: any, index: number) => (
                    <div key={index} className="bg-muted p-4 rounded-md border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Hint {index + 1}</span>
                        <span className="text-xs text-muted-foreground">Cost: {hint.cost} pts</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="hover-glow"
                        data-testid={`button-hint-${index}`}
                      >
                        <HelpCircle className="w-3 h-3 mr-1" />
                        Unlock Hint
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
