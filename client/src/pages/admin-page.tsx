import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Challenge = any;

export default function AdminPage() {
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/challenges', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch challenges');
      const data = await res.json();
      setChallenges(data);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChallenges(); }, []);

  const publish = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/challenges/${id}/publish`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to publish');
      toast({ title: 'Published', description: 'Challenge is now live' });
      fetchChallenges();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const unpublish = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/challenges/${id}/unpublish`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to unpublish');
      toast({ title: 'Unpublished', description: 'Challenge is now hidden' });
      fetchChallenges();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const revealAnswer = async (id: string) => {
    // Admin page already receives flagHash; for security we won't show raw flags.
    // If you want to update answer, implement an endpoint to set a new flag.
    const ch = challenges.find(c => c.id === id);
    if (!ch) return;
    toast({ title: 'Flag Hash', description: ch.flagHash || 'N/A' });
  };

  const publishAll = async () => {
    const unpublishedCount = challenges.filter(c => !c.published).length;
    if (unpublishedCount === 0) {
      toast({ title: 'Info', description: 'All challenges are already published' });
      return;
    }

    setLoading(true);
    try {
      let successCount = 0;
      for (const challenge of challenges) {
        if (!challenge.published) {
          const res = await fetch(`/api/admin/challenges/${challenge.id}/publish`, { 
            method: 'POST', 
            credentials: 'include' 
          });
          if (res.ok) {
            successCount++;
          }
        }
      }
      toast({ 
        title: 'Published', 
        description: `Successfully published ${successCount} challenge(s)` 
      });
      fetchChallenges();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text terminal-cursor mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage challenges and publication</p>
          </div>
          <Button 
            onClick={publishAll} 
            disabled={loading || challenges.every(c => c.published)}
            className="hover-glow"
            data-testid="button-publish-all"
          >
            Publish All
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {challenges.map((c) => (
            <Card key={c.id} className="neon-border">
              <CardHeader>
                <CardTitle>{c.title} <span className="text-sm text-muted-foreground ml-2">{c.published ? 'Published' : 'Draft'}</span></CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 text-sm text-muted-foreground">Category: {c.category} • Difficulty: {c.difficulty} • Points: {c.points}</div>
                <div className="mb-4 text-sm">{c.description}</div>
                <div className="flex gap-2">
                  {!c.published ? (
                    <Button onClick={() => publish(c.id)} data-testid={`button-publish-${c.id}`}>Publish</Button>
                  ) : (
                    <Button variant="outline" onClick={() => unpublish(c.id)} data-testid={`button-unpublish-${c.id}`}>Unpublish</Button>
                  )}
                  <Button variant="ghost" onClick={() => revealAnswer(c.id)}>Show Flag Hash</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
