import type { BackendAdapter } from "./BackendAdapter";
import { NeonBackendAdapter } from "./neon/NeonBackendAdapter";
import type { Project } from "@/lib/db/schema";

export function getBackendAdapter(project: Project): BackendAdapter {
  switch (project.backendType) {
    case "neon": {
      if (!project.backendProjectId) {
        throw new Error("Missing Neon project ID");
      }
      return new NeonBackendAdapter(project.backendProjectId);
    }
    default:
      throw new Error(`Unsupported backend: ${project.backendType}`);
  }
}
