import {
  getNeonProductionBranch,
  initNeonAuth,
  getDatabaseConnectionUri,
  getLatestCommitHash,
  createInitialVersion,
  saveProjectSecrets,
  setCurrentDevVersion,
  buildSecretsFromNeonAuth,
  createBackendSnapshot,
  createCheckpointVersion,
  copyProjectSecrets,
  warmUpDevServer,
  deleteFreestyleRepository,
  deleteBackendProject,
  deleteAssistantUIThread,
  getProjectVersionIds,
  clearCurrentDevVersion,
  deleteProjectSecrets,
  deleteProjectVersions,
  deleteProjectRecord,
} from "@/lib/steps";
import { Project } from "@/lib/db/schema";

export async function initalizeFirstProjectVersion(project: Project) {
  "use workflow";
  if (project.backendType !== "neon" || !project.backendProjectId) {
    throw new Error(
      `Initial version workflow currently supports Neon only. Received: ${project.backendType}`,
    );
  }

  const prodBranch = await getNeonProductionBranch(project.backendProjectId);

  const [neonAuth, databaseUrl, initialCommitHash, initialSnapshotId] =
    await Promise.all([
      initNeonAuth(project.backendProjectId, prodBranch.id),
      getDatabaseConnectionUri(project.backendProjectId),
      getLatestCommitHash(project.repoId),
      createBackendSnapshot(project),
    ]);

  const initialVersion = await createInitialVersion(
    project.id,
    initialCommitHash,
    initialSnapshotId,
  );

  const secrets = buildSecretsFromNeonAuth(neonAuth, databaseUrl);
  await Promise.all([
    saveProjectSecrets(initialVersion.id, secrets),
    setCurrentDevVersion(project.id, initialVersion.id),
    warmUpDevServer(project, secrets), // Warm up Freestyle Dev Server in parallel
  ]);

  return { success: true, versionId: initialVersion.id };
}

export async function createManualCheckpoint(
  project: Project,
  currentDevVersionId: string,
  assistantMessageId: string | null,
) {
  "use workflow";
  const [currentCommitHash, snapshotId] = await Promise.all([
    getLatestCommitHash(project.repoId),
    createBackendSnapshot(project),
  ]);

  const checkpointVersion = await createCheckpointVersion(
    project.id,
    currentCommitHash,
    snapshotId,
    assistantMessageId,
  );

  await Promise.all([
    copyProjectSecrets(currentDevVersionId, checkpointVersion.id),
    setCurrentDevVersion(project.id, checkpointVersion.id),
  ]);

  return { success: true, versionId: checkpointVersion.id };
}

export async function deleteProject(project: Project) {
  "use workflow";

  // Get version IDs to delete secrets
  const versionIds = await getProjectVersionIds(project.id);

  // Clear FK reference before deleting versions
  await clearCurrentDevVersion(project.id);

  // Delete secrets and versions
  if (versionIds.length > 0) {
    await deleteProjectSecrets(versionIds);
  }

  await deleteProjectVersions(project.id);

  await deleteProjectRecord(project.id);

  // Delete external resources in parallel
  await Promise.all([
    deleteFreestyleRepository(project.repoId),
    deleteBackendProject(project),
    deleteAssistantUIThread(project.userId, project.threadId),
  ]);

  return { success: true };
}
