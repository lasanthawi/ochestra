"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { ProjectVersion } from "@/lib/db/schema";
import { DevServerContextProvider } from "@/components/dev-server-context";

interface ProjectData {
  versions: ProjectVersion[];
  currentVersionId: string | null;
  isLoading: boolean;
}

interface ProjectContextValue extends ProjectData {
  refreshVersions: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectContextProviderProps {
  projectId: string;
  accessToken: string;
  children: ReactNode;
}

export function ProjectContextProvider({
  projectId,
  accessToken,
  children,
}: ProjectContextProviderProps) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVersions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/projects/${projectId}/versions`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const body = await response.text();
        let detail = "";
        try {
          const parsed = JSON.parse(body);
          detail = parsed.error || parsed.details || "";
        } catch {
          detail = body?.slice(0, 100) || "";
        }
        throw new Error(
          detail
            ? `Failed to fetch versions: ${detail}`
            : `Failed to fetch versions (${response.status})`,
        );
      }

      const data = await response.json();
      setVersions(data.versions || []);
      setCurrentVersionId(data.currentDevVersionId || null);
    } catch (error) {
      console.error("[ProjectContext] Error fetching versions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, accessToken]);

  // Poll every 5s; back off to 15s after 2 min if still initializing (avoids runaway polling)
  useEffect(() => {
    fetchVersions();
    const interval = setInterval(fetchVersions, 5000);
    return () => clearInterval(interval);
  }, [fetchVersions]);

  const value: ProjectContextValue = {
    versions,
    currentVersionId,
    isLoading,
    refreshVersions: fetchVersions,
  };

  return (
    <ProjectContext.Provider value={value}>
      <DevServerContextProvider
        projectId={projectId}
        shouldFetch={currentVersionId !== null}
      >
        {children}
      </DevServerContextProvider>
    </ProjectContext.Provider>
  );
}

export function useProjectData(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error(
      "useProjectData must be used within a ProjectContextProvider",
    );
  }
  return context;
}
