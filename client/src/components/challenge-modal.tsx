import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Flag, User, Clock, HelpCircle, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ChallengeModalProps {
  challengeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChallengeModal({ challengeId, isOpen, onClose }: ChallengeModalProps) {
  const { toast } = useToast();
  const [flagInput, setFlagInput] = useState("");

  const { data: challenge, isLoading } = useQuery({
    queryKey: ["/api/challenges", challengeId],
    queryFn: async () => {
      if (!challengeId) return null;
      const res = await fetch(`/api/challenges/${challengeId}`);
      if (!res.ok) throw new Error("Failed to fetch challenge");
      return res.json();
    },
    enabled: !!challengeId && isOpen,
  });

  const submitFlagMutation = useMutation({
    mutationFn: async (flag: string) => {
      if (!challengeId) throw new Error("No challenge selected");
      const res = await apiRequest("POST", `/api/challenges/${challengeId}/submit`, { flag });
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
        onClose();
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

  const useHintMutation = useMutation({
    mutationFn: async (hintIndex: number) => {
      if (!challengeId) throw new Error("No challenge selected");
      const res = await apiRequest("POST", `/api/challenges/${challengeId}/hints/${hintIndex}`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Hint Unlocked",
        description: `Hint: ${data.hint} (Cost: ${data.cost} points)`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unlock hint",
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

  const handleUseHint = (hintIndex: number) => {
    if (window.confirm("Are you sure you want to unlock this hint? Points will be deducted.")) {
      useHintMutation.mutate(hintIndex);
    }
  };

  const difficultyColors = {
    Easy: "bg-green-500/20 text-green-400",
    Medium: "bg-orange-500/20 text-orange-400",
    Hard: "bg-red-500/20 text-red-400",
    Insane: "bg-purple-500/20 text-purple-400",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] neon-border bg-card" data-testid="challenge-modal">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl gradient-text" data-testid="modal-title">
              {challenge?.title || "Loading..."}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-modal">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-20 bg-muted rounded animate-pulse" />
            </div>
          ) : challenge ? (
            <div className="space-y-6 p-1">
              {/* Challenge Info */}
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="secondary" className="text-xs" data-testid="modal-category">
                  {challenge.category}
                </Badge>
                <Badge 
                  className={`text-xs ${difficultyColors[challenge.difficulty as keyof typeof difficultyColors] || 'bg-muted'}`}
                  data-testid="modal-difficulty"
                >
                  {challenge.difficulty}
                </Badge>
                <span className="text-primary font-bold" data-testid="modal-points">
                  {challenge.points} points
                </span>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <User className="w-3 h-3" />
                  <span data-testid="modal-creator">{challenge.creator?.username}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Clock className="w-3 h-3" />
                  <span data-testid="modal-created">
                    {new Date(challenge.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              {/* Challenge Description */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Description</h3>
                <div className="prose prose-invert max-w-none" data-testid="modal-description">
                  <ReactMarkdown>{challenge.description}</ReactMarkdown>
                </div>
              </div>
              
              {/* Files/Artifacts */}
              {challenge.artifacts && challenge.artifacts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-primary">Files</h3>
                  <div className="space-y-2">
                    {challenge.artifacts.map((file: any, index: number) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-3 rounded-md">
                        <div className="flex items-center gap-3">
                          <Download className="w-4 h-4 text-primary" />
                          <span data-testid={`modal-filename-${index}`}>{file.name}</span>
                          <span className="text-muted-foreground text-sm">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          className="hover-glow"
                          onClick={() => window.open(file.url, '_blank')}
                          data-testid={`modal-download-${index}`}
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
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-primary">Submit Flag</h3>
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      placeholder="flag{...}"
                      value={flagInput}
                      onChange={(e) => setFlagInput(e.target.value)}
                      className="flex-1 font-mono"
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmitFlag()}
                      data-testid="modal-flag-input"
                    />
                    <Button
                      onClick={handleSubmitFlag}
                      disabled={submitFlagMutation.isPending || !flagInput.trim()}
                      className="hover-glow"
                      data-testid="modal-submit-flag"
                    >
                      <Flag className="mr-2 h-4 w-4" />
                      {submitFlagMutation.isPending ? "Submitting..." : "Submit"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rate limited: 10 submissions per minute
                  </p>
                </div>
              )}
              
              {challenge.hasSolved && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-md p-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <Flag className="w-4 h-4" />
                    <span className="font-medium">Challenge Solved!</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have already solved this challenge.
                  </p>
                </div>
              )}
              
              {/* Hints */}
              {challenge.hints && challenge.hints.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-primary">Hints</h3>
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
                          onClick={() => handleUseHint(index)}
                          disabled={useHintMutation.isPending}
                          data-testid={`modal-hint-${index}`}
                        >
                          <HelpCircle className="w-3 h-3 mr-1" />
                          {useHintMutation.isPending ? "Unlocking..." : "Unlock Hint"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-destructive">Failed to load challenge details.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
