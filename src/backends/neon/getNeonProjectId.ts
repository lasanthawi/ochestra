import type { Project } from "@/lib/db/schema";

export function getNeonProjectId(project: Project): string {
  if (project.backendType !== "neon" || !project.backendProjectId) {
    throw new Error(
      `Project ${project.id} is not configured with a Neon backend`,
    );
  }

  return project.backendProjectId;
}
