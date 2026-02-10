export type BackendType = "neon" | "firebase" | "aws";

export interface BackendSnapshot {
  id: string;
  createdAt: Date;
  meta?: Record<string, unknown>;
}

export interface BackendAdapter {
  readonly type: BackendType;

  provision(projectId: string): Promise<void>;
  destroy(projectId: string): Promise<void>;

  snapshot(projectId: string): Promise<BackendSnapshot>;
  rollback(projectId: string, snapshotId: string): Promise<void>;

  buildEnv(projectId: string): Promise<Record<string, string>>;

  validate(projectId: string): Promise<void>;
}
