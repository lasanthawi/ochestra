"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { AssistantCloud } from "@assistant-ui/react";
import { ProfileButton } from "@/components/profile-button";
import { VersionsDropdown } from "@/components/versions-dropdown";
import {
  ProjectContextProvider,
  useProjectData,
} from "@/components/project-context";
import { useDevServerData } from "@/components/dev-server-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ExternalLink,
  Rocket,
  Code2,
  ArrowLeft,
  MoreVertical,
  ChevronDown,
  GitBranch,
  MessageSquare,
  Monitor,
} from "lucide-react";
import { ModelSelectorModal } from "@/components/model-selector-modal";
import { useModelSelection } from "@/lib/model-selection/hooks";
import type { ModelSelection } from "@/lib/model-selection/types";
import { useEffect, useState } from "react";
import { FreestyleDevServer } from "freestyle-sandboxes/react/dev-server";
import { requestDevServer } from "@/actions/preview-actions";
import Link from "next/link";

function InitializingPlaceholder() {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStuck(true), 60000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
      <div className="space-y-2 text-center">
        <div className="text-muted-foreground">Initializing project...</div>
        <Skeleton className="mx-auto h-4 w-48" />
      </div>
      {stuck && (
        <p className="max-w-sm text-center text-sm text-amber-600 dark:text-amber-400">
          Taking longer than usual. The workflow may have failed — try refreshing
          or creating a new project.
        </p>
      )}
    </div>
  );
}

interface ProjectChatProps {
  projectId: string;
  projectName: string;
  repoId: string;
  threadId: string;
  accessToken: string;
  initialModelSelection: ModelSelection;
}

/** Renders loading/config states. Chat UI only mounts when we have Assistant Cloud URL. */
const ProjectChatContent = (props: ProjectChatProps) => {
  const [assistantCloudUrl, setAssistantCloudUrl] = useState<string | false | null>(null);
  useEffect(() => {
    const url =
      process.env.NEXT_PUBLIC_ASSISTANT_CLOUD_API_URL ||
      (process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL?.includes("proj-")
        ? process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL
        : null);
    setAssistantCloudUrl(url || false);
  }, []);

  if (assistantCloudUrl === null) {
    return (
      <div className="flex h-dvh flex-col">
        <header className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <div className="h-5 w-5" />
          <Skeleton className="h-5 w-20" />
          <div className="h-8 w-8" />
        </header>
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="h-12 w-48" />
        </div>
      </div>
    );
  }

  if (assistantCloudUrl === false) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-4 py-2">
          <Link
            href="/projects"
            className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="truncate text-lg font-semibold">{props.projectName}</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-left max-w-md">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Assistant Cloud not configured
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">NEXT_PUBLIC_ASSISTANT_CLOUD_API_URL</code> to your <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env</code> with your project URL (e.g.{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">https://proj-XXXXX.assistant-api.com</code>
              ) from{" "}
              <a
                href="https://cloud.assistant-ui.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                cloud.assistant-ui.com
              </a>
              .
            </p>
          </div>
          <ProfileButton />
        </div>
      </div>
    );
  }

  return <ProjectChatWithCloud {...props} assistantCloudUrl={assistantCloudUrl} />;
};

interface ProjectChatWithCloudProps extends ProjectChatProps {
  assistantCloudUrl: string;
}

const ProjectChatWithCloud = ({
  projectId,
  projectName,
  repoId,
  threadId,
  accessToken,
  initialModelSelection,
  assistantCloudUrl,
}: ProjectChatWithCloudProps) => {
  const { currentVersionId } = useProjectData();
  const { devServerUrl, codeServerUrl, deploymentUrl } = useDevServerData();
  const [isDeploying, setIsDeploying] = useState(false);
  const { modelSelection, updateModelSelection } = useModelSelection({
    initialSelection: initialModelSelection,
    accessToken,
    validatePersonalProvider: true,
  });
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");

  const wrappedRequestDevServer = async (args?: { repoId: string }) => {
    return await requestDevServer({ projectId });
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/deploy`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Deployment failed");
      }
      console.log("Deployment triggered successfully");
    } catch (error) {
      console.error("Failed to deploy:", error);
    } finally {
      setIsDeploying(false);
    }
  };

  const cloud = new AssistantCloud({
    baseUrl: assistantCloudUrl,
    authToken: () =>
      fetch("/api/chat/token", { method: "POST" }).then((r) =>
        r.json().then((data: { token?: string }) => data.token ?? null),
      ),
  });

  const runtime = useChatRuntime({
    cloud,
    transport: new AssistantChatTransport({
      api: process.env.NEXT_PUBLIC_MASTRA_API_URL!,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        projectId: projectId,
        modelId: modelSelection.modelId,
        keyProvider: modelSelection.provider,
      },
    }),
    onError: (error) => {
      console.error("Chat runtime error:", error.message);
    },
  });

  useEffect(() => {
    let switched = false;
    return runtime.threads.subscribe(() => {
      if (runtime.threads.getState().isLoading || switched) return;
      switched = true;
      if (runtime.threads.getState().threadIds.length === 0) return;
      runtime.threads.switchToThread(threadId);
    });
  }, [runtime, threadId]);

  const isThreadReady = runtime.threads.getState().mainThreadId === threadId;
  const isVersionReady = currentVersionId !== null;

  const getModelDisplayName = () => {
    const parts = modelSelection.modelId.split("/");
    if (parts.length > 1) {
      const modelPart = parts[1];
      return modelPart
        .replace(/-/g, " ")
        .replace(/\d{8}$/, "")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
        .trim();
    }
    return modelSelection.modelId;
  };

  const chatPane = (
    <div className="flex h-full flex-1 flex-col overflow-hidden border-r md:border-r">
      {isThreadReady && isVersionReady ? (
        <Thread />
      ) : (
        <div className="flex h-full flex-col gap-4 p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-3/4" />
          <Skeleton className="h-20 w-2/3 self-end" />
          <Skeleton className="h-20 w-3/4" />
          <Skeleton className="h-20 w-2/3 self-end" />
          <div className="flex-1" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}
    </div>
  );

  const previewPane = (
    <div className="flex flex-1 flex-col overflow-hidden bg-muted">
      {isVersionReady ? (
        <FreestyleDevServer
          actions={{ requestDevServer: wrappedRequestDevServer }}
          repoId={repoId}
        />
      ) : (
        <InitializingPlaceholder />
      )}
    </div>
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ModelSelectorModal
        open={isModelSelectorOpen}
        onOpenChange={setIsModelSelectorOpen}
        accessToken={accessToken}
        selectedModel={modelSelection}
        onModelSelect={updateModelSelection}
      />
      <div className="flex h-dvh h-[100dvh] flex-col overflow-hidden">
        {/* Header - compact on mobile */}
        <header className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-3 py-2 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <Link
              href="/projects"
              className="flex shrink-0 items-center text-muted-foreground transition-colors hover:text-foreground touch-manipulation"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="truncate text-base font-semibold sm:text-lg">
              {projectName}
            </h1>
            <div className="hidden sm:block">
              <VersionsDropdown projectId={projectId} accessToken={accessToken} />
            </div>
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5" />
              Design → Develop → Test → Deploy
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModelSelectorOpen(true)}
              className="hidden touch-manipulation sm:inline-flex"
            >
              <span className="mr-2 max-w-20 truncate sm:max-w-none">
                {getModelDisplayName()}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-manipulation sm:px-3"
                >
                  <span className="hidden sm:mr-2 sm:inline">Project Options</span>
                  <MoreVertical className="h-4 w-4 sm:hidden" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Development</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {devServerUrl && (
                    <DropdownMenuItem
                      onClick={() => window.open(devServerUrl, "_blank")}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      <span>Open Dev Preview</span>
                    </DropdownMenuItem>
                  )}
                  {codeServerUrl && (
                    <DropdownMenuItem
                      onClick={() => window.open(codeServerUrl, "_blank")}
                    >
                      <Code2 className="mr-2 h-4 w-4" />
                      <span>View in VS Code</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Production</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {isVersionReady && (
                    <DropdownMenuItem
                      onClick={handleDeploy}
                      disabled={isDeploying}
                    >
                      <Rocket className="mr-2 h-4 w-4" />
                      <span>{isDeploying ? "Deploying..." : "Deploy"}</span>
                    </DropdownMenuItem>
                  )}
                  {isVersionReady && (
                    <DropdownMenuItem
                      onClick={() => window.open(deploymentUrl, "_blank")}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      <span>View Live Site</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <ProfileButton />
          </div>
        </header>

        {/* Mobile: Versions bar (compact) - only when we have versions */}
        {currentVersionId && (
          <div className="flex shrink-0 border-b px-3 py-1.5 sm:hidden">
            <VersionsDropdown projectId={projectId} accessToken={accessToken} />
          </div>
        )}

        {/* Main content: stacked tabs on mobile, side-by-side on desktop */}
        <div className="flex flex-1 overflow-hidden">
          {/* Mobile: tabbed view with bottom nav */}
          <div className="flex w-full flex-1 flex-col md:hidden">
            <div className="flex-1 overflow-hidden">
              {mobileTab === "chat" ? chatPane : previewPane}
            </div>
            {/* Bottom tab bar - native app style */}
            <nav className="flex shrink-0 border-t bg-background px-2 pb-[env(safe-area-inset-bottom)] pt-2">
              <button
                type="button"
                onClick={() => setMobileTab("chat")}
                className={`flex flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-lg py-2 transition-colors hover:bg-muted/50 ${
                  mobileTab === "chat"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs font-medium">Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("preview")}
                className={`flex flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-lg py-2 transition-colors hover:bg-muted/50 ${
                  mobileTab === "preview"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Monitor className="h-5 w-5" />
                <span className="text-xs font-medium">Preview</span>
              </button>
            </nav>
          </div>

          {/* Desktop: side-by-side */}
          <div className="hidden flex-1 overflow-hidden md:flex">
            {chatPane}
            {previewPane}
          </div>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
};

export const ProjectChat = (props: ProjectChatProps) => {
  return (
    <ProjectContextProvider
      projectId={props.projectId}
      accessToken={props.accessToken}
    >
      <ProjectChatContent {...props} />
    </ProjectContextProvider>
  );
};
