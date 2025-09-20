import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, X, Medal, Crown, Star, Target } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface AchievementToastProps {
  achievement: Achievement | null;
  isVisible: boolean;
  onClose: () => void;
}

export function AchievementToast({ achievement, isVisible, onClose }: AchievementToastProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      // Delay unmounting to allow exit animation
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const getAchievementIcon = (icon: string) => {
    const className = "text-yellow-400 text-2xl pulse-neon";
    switch (icon) {
      case 'trophy':
        return <Trophy className={className} />;
      case 'medal':
        return <Medal className={className} />;
      case 'crown':
        return <Crown className={className} />;
      case 'star':
        return <Star className={className} />;
      case 'target':
        return <Target className={className} />;
      default:
        return <Trophy className={className} />;
    }
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div 
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      data-testid="achievement-toast"
    >
      <Card className="neon-border bg-card shadow-2xl min-w-[300px] max-w-[400px] hover-glow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {achievement && getAchievementIcon(achievement.icon)}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-primary text-lg" data-testid="achievement-title">
                Achievement Unlocked!
              </p>
              <p className="text-sm text-foreground font-medium" data-testid="achievement-name">
                {achievement?.name}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="achievement-description">
                {achievement?.description}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-muted-foreground hover:text-primary flex-shrink-0"
              data-testid="button-close-achievement"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for managing achievement notifications
export function useAchievementToast() {
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showAchievement = (newAchievement: Achievement) => {
    setAchievement(newAchievement);
    setIsVisible(true);
  };

  const hideAchievement = () => {
    setIsVisible(false);
  };

  return {
    achievement,
    isVisible,
    showAchievement,
    hideAchievement,
    AchievementToast: () => (
      <AchievementToast 
        achievement={achievement}
        isVisible={isVisible}
        onClose={hideAchievement}
      />
    ),
  };
}
