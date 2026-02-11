import { stackServerApp } from "@/lib/stack/server";
import { db } from "@/lib/db/db";
import { projectsTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ProjectsList } from "@/components/projects-list";
import { CreateProjectButton } from "@/components/create-project-button";
import { ProfileButton } from "@/components/profile-button";

export default async function ProjectsPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });

  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, user.id))
    .orderBy(projectsTable.createdAt);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 min-h-14 items-center justify-between gap-3 px-4 sm:container sm:h-16 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-6">
            <h1 className="truncate text-lg font-bold sm:text-xl">Orchestral brain</h1>
            <nav className="hidden sm:flex items-center gap-4">
              <span className="text-sm font-medium text-primary">Projects</span>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <CreateProjectButton />
            <ProfileButton />
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto px-4 py-6 sm:container sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Your Projects</h2>
            <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">
              Manage and access all your code generation projects
            </p>
          </div>
          <ProjectsList projects={projects} />
        </div>
      </main>
    </div>
  );
}
