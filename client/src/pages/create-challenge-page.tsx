import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Plus, X, FileText } from "lucide-react";
import { useLocation } from "wouter";

const challengeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  difficulty: z.string().min(1, "Difficulty is required"),
  points: z.number().min(50, "Minimum 50 points").max(1000, "Maximum 1000 points"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  flag: z.string().min(1, "Flag is required"),
  published: z.boolean().default(false),
});

type ChallengeForm = z.infer<typeof challengeSchema>;

interface Hint {
  text: string;
  cost: number;
}

export default function CreateChallengePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [hints, setHints] = useState<Hint[]>([]);

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

  const createChallengeMutation = useMutation({
    mutationFn: async (data: ChallengeForm & { files: File[]; hints: Hint[] }) => {
      const formData = new FormData();
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'files' && key !== 'hints') {
          formData.append(key, value.toString());
        }
      });
      
      // Add hints as JSON
      formData.append('hints', JSON.stringify(data.hints));
      
      // Add files
      data.files.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch('/api/challenges', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create challenge');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Challenge Created! 🎉",
        description: "Your challenge has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
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
    createChallengeMutation.mutate({
      ...data,
      files: selectedFiles,
      hints: hints.filter(hint => hint.text.trim() !== ""),
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text terminal-cursor mb-2">Create Challenge</h1>
          <p className="text-muted-foreground">Design a new challenge for the community</p>
        </div>

        <Card className="neon-border" data-testid="challenge-form">
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
                    data-testid="input-title"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select onValueChange={(value) => form.setValue("category", value)}>
                    <SelectTrigger className="mt-1" data-testid="select-category">
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
                  <Select onValueChange={(value) => form.setValue("difficulty", value)}>
                    <SelectTrigger className="mt-1" data-testid="select-difficulty">
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
                    data-testid="input-points"
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
                  placeholder="Describe your challenge here. You can use **markdown** for formatting..."
                  className="mt-1 font-mono"
                  data-testid="textarea-description"
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
              
              {/* Flag */}
              <div>
                <Label htmlFor="flag">Flag</Label>
                <Input
                  id="flag"
                  type="password"
                  {...form.register("flag")}
                  placeholder="flag{this_will_be_hashed}"
                  className="mt-1 font-mono"
                  data-testid="input-flag"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Flag will be hashed and salted for security
                </p>
                {form.formState.errors.flag && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.flag.message}
                  </p>
                )}
              </div>
              
              {/* File Uploads */}
              <div>
                <Label>Challenge Files</Label>
                <div className="mt-1 border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/20">
                  <Upload className="h-8 w-8 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">Drag & drop files here, or click to browse</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Max 50MB total. Supported: zip, tar.gz, txt, jpg, png, pdf
                  </p>
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    data-testid="input-files"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    data-testid="button-choose-files"
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
                          data-testid={`button-remove-file-${index}`}
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
                  {hints.map((hint, index) => (
                    <div key={index} className="flex gap-3">
                      <Input
                        placeholder={`Hint ${index + 1}...`}
                        value={hint.text}
                        onChange={(e) => updateHint(index, 'text', e.target.value)}
                        className="flex-1"
                        data-testid={`input-hint-text-${index}`}
                      />
                      <Input
                        type="number"
                        placeholder="Cost"
                        min="0"
                        max="100"
                        value={hint.cost}
                        onChange={(e) => updateHint(index, 'cost', parseInt(e.target.value) || 0)}
                        className="w-24"
                        data-testid={`input-hint-cost-${index}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHint(index)}
                        data-testid={`button-remove-hint-${index}`}
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
                    data-testid="button-add-hint"
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
                  data-testid="checkbox-published"
                />
                <Label htmlFor="published" className="text-sm">
                  Publish immediately (make visible to all users)
                </Label>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.setValue("published", false)}
                  disabled={createChallengeMutation.isPending}
                  data-testid="button-save-draft"
                >
                  Save as Draft
                </Button>
                <Button
                  type="submit"
                  className="hover-glow"
                  disabled={createChallengeMutation.isPending}
                  data-testid="button-create-challenge"
                >
                  {createChallengeMutation.isPending ? "Creating..." : "Create Challenge"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
