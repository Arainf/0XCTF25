import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, X, FileText, Loader2 } from "lucide-react";

const challengeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  difficulty: z.string().min(1, "Difficulty is required"),
  points: z.number().min(50, "Minimum 50 points").max(1000, "Maximum 1000 points"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  flag: z.string().optional(),
  published: z.boolean().default(false),
});

type ChallengeForm = z.infer<typeof challengeSchema>;

interface Hint {
  text: string;
  cost: number;
}

export default function EditChallengePage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [hints, setHints] = useState<Hint[]>([]);

  const { data: challenge, isLoading } = useQuery({
    queryKey: [`/api/challenges/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${id}`);
      if (!res.ok) throw new Error("Failed to fetch challenge");
      return res.json();
    },
  });

  const form = useForm<ChallengeForm>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: "",
      category: "",
      difficulty: "",
      points: 100,
      description: "",
      flag: "",
      published: false,
    },
  });

  useEffect(() => {
    if (challenge) {
      form.reset({
        title: challenge.title,
        category: challenge.category,
        difficulty: challenge.difficulty,
        points: challenge.points,
        description: challenge.description,
        published: challenge.published,
      });
      // Parse hints if it's a string, otherwise use as-is
      const parsedHints = typeof challenge.hints === 'string' 
        ? JSON.parse(challenge.hints) 
        : (Array.isArray(challenge.hints) ? challenge.hints : []);
      setHints(parsedHints);
    }
  }, [challenge, form]);

  const updateChallengeMutation = useMutation({
    mutationFn: async (data: ChallengeForm) => {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'files' && key !== 'hints') {
          formData.append(key, value.toString());
        }
      });
      
      formData.append('hints', JSON.stringify(hints));
      
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch(`/api/challenges/${id}`, {
        method: 'PUT',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update challenge');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Challenge Updated! ✨",
        description: "Your challenge has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setLocation("/profile");
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addHint = () => {
    setHints(prev => [...prev, { text: "", cost: 10 }]);
  };

  const updateHint = (index: number, field: 'text' | 'cost', value: string | number) => {
    setHints(prev => prev.map((hint, i) => 
      i === index ? { ...hint, [field]: value } : hint
    ));
  };

  const removeHint = (index: number) => {
    setHints(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: ChallengeForm) => {
    updateChallengeMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text terminal-cursor mb-2">Edit Challenge</h1>
          <p className="text-muted-foreground">Update your challenge details</p>
        </div>

        <Card className="neon-border">
          <CardHeader>
            <CardTitle>Challenge Details</CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="My Awesome Challenge"
                    className="mt-1"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select onValueChange={(value) => form.setValue("category", value)} defaultValue={challenge?.category}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Web">Web</SelectItem>
                      <SelectItem value="Binary">Binary</SelectItem>
                      <SelectItem value="Crypto">Crypto</SelectItem>
                      <SelectItem value="Forensics">Forensics</SelectItem>
                      <SelectItem value="Misc">Misc</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.category.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select onValueChange={(value) => form.setValue("difficulty", value)} defaultValue={challenge?.difficulty}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                      <SelectItem value="Insane">Insane</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.difficulty && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.difficulty.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    min="50"
                    max="1000"
                    step="25"
                    {...form.register("points", { valueAsNumber: true })}
                    placeholder="100"
                    className="mt-1"
                  />
                  {form.formState.errors.points && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.points.message}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Description */}
              <div>
                <Label htmlFor="description">Description (Markdown supported)</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  rows={8}
                  placeholder="Describe your challenge here..."
                  className="mt-1 font-mono"
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
              
              {/* Flag */}
              <div>
                <Label htmlFor="flag">Flag (optional - leave blank to keep existing)</Label>
                <Input
                  id="flag"
                  type="password"
                  {...form.register("flag")}
                  placeholder="Leave blank to keep current flag"
                  className="mt-1 font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only fill this to change the flag
                </p>
              </div>
              
              {/* File Uploads */}
              <div>
                <Label>Challenge Files</Label>
                <div className="mt-1 border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/20">
                  <p className="text-muted-foreground mb-2">Add new files (optional)</p>
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Choose Files
                  </Button>
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-3 rounded-md">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-primary" />
                          <span>{file.name}</span>
                          <span className="text-muted-foreground text-sm">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Hints */}
              <div>
                <Label>Hints (Optional)</Label>
                <div className="mt-1 space-y-3">
                  {Array.isArray(hints) && hints.map((hint, index) => (
                    <div key={index} className="flex gap-3">
                      <Input
                        placeholder={`Hint ${index + 1}...`}
                        value={hint.text}
                        onChange={(e) => updateHint(index, 'text', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Cost"
                        min="0"
                        max="100"
                        value={hint.cost}
                        onChange={(e) => updateHint(index, 'cost', parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHint(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={addHint}
                    className="text-primary hover:text-secondary transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Hint
                  </Button>
                </div>
              </div>
              
              {/* Published checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="published"
                  checked={form.watch("published")}
                  onCheckedChange={(checked) => form.setValue("published", !!checked)}
                />
                <Label htmlFor="published" className="text-sm">
                  Publish (make visible to all users)
                </Label>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/profile")}
                  disabled={updateChallengeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="hover-glow"
                  disabled={updateChallengeMutation.isPending}
                >
                  {updateChallengeMutation.isPending ? "Updating..." : "Update Challenge"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
