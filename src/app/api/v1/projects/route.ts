import { NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack/server";
import { db } from "@/lib/db/db";
import { projectsTable, usersTable } from "@/lib/db/schema";
import { freestyleService } from "@/lib/freestyle";
import { createAssistantThread } from "@/lib/assistant-ui";
import { neonService } from "@/lib/neon";
import { revalidatePath } from "next/cache";
import { start } from "workflow/api";
import { initalizeFirstProjectVersion } from "@/lib/workflows";
import { z } from "zod";
import { parseRequestJson } from "@/lib/parser-utils";

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  backendType: z.enum(["neon", "firebase", "aws"]).default("neon"),
  repoType: z.enum(["template", "existing"]).default("template"),
  repoUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await parseRequestJson(
      request,
      createProjectSchema,
    );
    if (error) {
      return error;
    }
    const { name, backendType, repoType, repoUrl } = data;

    console.log("[API] Create project request from user:", user.id);
    console.log("[API] Project name:", name);

    // Create repo in Freestyle, backend project (Neon for now), and AssistantCloud thread in parallel
    console.log(
      "[API] Calling Freestyle, Neon, and AssistantCloud APIs in parallel...",
    );
    if (repoType === "existing" && !repoUrl) {
      return NextResponse.json(
        { error: "repoUrl is required when repoType is 'existing'" },
        { status: 400 },
      );
    }

    if (backendType !== "neon") {
      return NextResponse.json(
        { error: `Unsupported backend type: ${backendType}` },
        { status: 400 },
      );
    }

    const sourceUrl =
      repoType === "existing" && repoUrl
        ? repoUrl
        : "https://github.com/andrelandgraf/neon-freestyle-template";

    const [{ repoId }, { neonProjectId, databaseUrl }, threadId] =
      await Promise.all([
        freestyleService.createRepo({ name, sourceUrl }),
        neonService.createProject(name),
        createAssistantThread(user.id, name),
      ]);
    console.log("[API] Freestyle repo created with ID:", repoId);
    console.log("[API] Neon project created with ID:", neonProjectId);
    console.log("[API] Database URL:", databaseUrl);
    console.log("[API] Thread created with ID:", threadId);

    try {
      freestyleService.initializeRawDevServer(repoId);
    } catch (_) {}

    // Ensure user exists in neon_auth.users_sync (required for FK). Neon Auth may not have
    // synced the Stack user yet; we upsert so the project insert can succeed.
    const rawJson = {
      id: user.id,
      displayName: user.displayName ?? null,
      primaryEmail: user.primaryEmail ?? null,
    };
    await db
      .insert(usersTable)
      .values({
        id: user.id,
        rawJson,
        name: user.displayName ?? null,
        email: user.primaryEmail ?? null,
      })
      .onConflictDoNothing({ target: usersTable.id });

    // Create project in database with Freestyle repoId, Neon project ID, and thread ID
    console.log("[API] Inserting project into database...");
    console.log("[API] Insert values:", {
      name,
      repoId,
      backendType,
      backendProjectId: neonProjectId,
      threadId,
      userId: user.id,
    });

    const [project] = await db
      .insert(projectsTable)
      .values({
        name,
        repoId,
        backendType,
        backendProjectId: neonProjectId,
        threadId,
        userId: user.id,
      })
      .returning();

    console.log("[API] Project created successfully:", project);

    console.log("[API] Triggering Workflow for project initialization...");
    await start(initalizeFirstProjectVersion, [project]);

    revalidatePath("/projects");

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API] Error creating project:", error);
    return NextResponse.json(
      {
        error: "Failed to create project",
        ...(process.env.NODE_ENV === "development" && { detail: message }),
      },
      { status: 500 },
    );
  }
}
