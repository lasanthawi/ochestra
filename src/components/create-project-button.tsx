"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function CreateProjectButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [repoType, setRepoType] = useState<"template" | "existing">("template");
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload: Record<string, string> = { name };
    if (repoType === "existing") {
      if (!repoUrl.trim()) {
        setError("Repository URL is required when using an existing repository.");
        setIsLoading(false);
        return;
      }
      payload.repoType = "existing";
      payload.repoUrl = repoUrl.trim();
    } else {
      payload.repoType = "template";
    }

    try {
      const response = await fetch("/api/v1/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const detail = body.detail ?? body.error ?? "Failed to create project";
        throw new Error(typeof detail === "string" ? detail : "Failed to create project");
      }

      const project = await response.json();

      setOpen(false);
      setName("");
      setRepoUrl("");
      setRepoType("template");
      router.push(`/projects/${project.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create project";
      setError(message);
      console.error("Error creating project:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setError(null);
          setRepoType("template");
          setRepoUrl("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg">
          <PlusIcon className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              A Freestyle repository will be created with a Neon database and AI chat.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">
                {error}
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="My Awesome Project"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-3">
              <Label>Repository source</Label>
              <RadioGroup
                value={repoType}
                onValueChange={(v) => setRepoType(v as "template" | "existing")}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="template" id="template" />
                  <Label htmlFor="template" className="font-normal cursor-pointer">
                    From template – Start from a preconfigured Next.js + Neon + Drizzle starter
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing" className="font-normal cursor-pointer">
                    From existing repository – Clone your own GitHub repo
                  </Label>
                </div>
              </RadioGroup>
              {repoType === "existing" && (
                <div className="grid gap-2 pl-6">
                  <Label htmlFor="repoUrl">GitHub repository URL</Label>
                  <Input
                    id="repoUrl"
                    placeholder="https://github.com/username/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Public GitHub URL. For best results, use a Next.js project with a similar structure to the template.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
