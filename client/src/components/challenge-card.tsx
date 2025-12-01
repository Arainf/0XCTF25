import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Download, Play, Check } from "lucide-react";
import { Link } from "wouter";

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  points: number;
  creator: {
    username: string;
  };
  solveCount: number;
  artifacts: Array<{ name: string; url: string; size: number }>;
  globalSolved?: boolean;
}

interface ChallengeCardProps {
  challenge: Challenge;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const difficultyColors = {
    Easy: "bg-green-500/20 text-green-400",
    Medium: "bg-orange-500/20 text-orange-400",
    Hard: "bg-red-500/20 text-red-400",
    Insane: "bg-purple-500/20 text-purple-400",
  };

  return (
    <Card 
      className={`neon-border hover-glow transition-all duration-200 overflow-hidden relative ${
        challenge.globalSolved ? 'border-green-500/50' : ''
      }`}
      data-testid={`card-challenge-${challenge.id}`}
    >
      {challenge.globalSolved && (
        <div className="absolute top-2 right-2 bg-green-500 text-black px-2 py-1 rounded text-xs font-bold">
          <Check className="w-3 h-3 mr-1 inline" />
          SOLVED
        </div>
      )}
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-primary mb-2" data-testid={`text-title-${challenge.id}`}>
              {challenge.title}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs" data-testid={`badge-category-${challenge.id}`}>
                {challenge.category}
              </Badge>
              <Badge 
                className={`text-xs ${difficultyColors[challenge.difficulty as keyof typeof difficultyColors] || 'bg-muted'}`}
                data-testid={`badge-difficulty-${challenge.id}`}
              >
                {challenge.difficulty}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-primary font-bold text-lg" data-testid={`text-points-${challenge.id}`}>
              {challenge.points} pts
            </div>
            <div className="text-muted-foreground text-sm" data-testid={`text-solves-${challenge.id}`}>
              {challenge.solveCount} solves
            </div>
          </div>
        </div>
        
        <p 
          className="text-muted-foreground text-sm mb-4 line-clamp-3" 
          data-testid={`text-description-${challenge.id}`}
        >
          {challenge.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <User className="w-3 h-3" />
            <span data-testid={`text-author-${challenge.id}`}>{challenge.creator.username}</span>
          </div>
          {challenge.artifacts?.length > 0 && (
            <div className="flex items-center gap-2">
              <Download className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {challenge.artifacts.length} file{challenge.artifacts.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      <div className="border-t border-border p-4 bg-muted/30">
        <Link href={`/challenge/${challenge.id}`} data-testid={`link-challenge-${challenge.id}`}>
          <Button className="w-full hover-glow">
            <Play className="mr-2 h-4 w-4" />
            {challenge.globalSolved ? 'View Challenge' : 'Start Challenge'}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
