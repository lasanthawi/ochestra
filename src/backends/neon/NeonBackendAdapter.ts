import type { BackendAdapter, BackendSnapshot } from "../BackendAdapter";
import { neonService } from "@/lib/neon";

export class NeonBackendAdapter implements BackendAdapter {
  readonly type = "neon" as const;

  constructor(private readonly neonProjectId: string) {}

  async provision(): Promise<void> {
    // Neon provisioning currently happens during project creation.
  }

  async destroy(): Promise<void> {
    await neonService.deleteProject(this.neonProjectId);
  }

  async snapshot(): Promise<BackendSnapshot> {
    const id = await neonService.createSnapshot(this.neonProjectId, {
      name: `checkpoint-${Date.now()}`,
    });

    return {
      id,
      createdAt: new Date(),
    };
  }

  async rollback(_projectId: string, snapshotId: string): Promise<void> {
    const prodBranch = await neonService.getProductionBranch(this.neonProjectId);
    if (!prodBranch?.id) {
      throw new Error("Production branch not found");
    }

    await neonService.applySnapshot(
      this.neonProjectId,
      snapshotId,
      prodBranch.id,
    );
  }

  async buildEnv(): Promise<Record<string, string>> {
    const databaseUrl = await neonService.getConnectionUri({
      projectId: this.neonProjectId,
    });

    return {
      DATABASE_URL: databaseUrl,
    };
  }

  async validate(): Promise<void> {
    if (!this.neonProjectId) {
      throw new Error("Neon project ID missing");
    }
  }
}
