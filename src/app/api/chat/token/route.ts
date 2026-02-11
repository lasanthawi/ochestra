import { stackServerApp } from "@/lib/stack/server";
import { AssistantCloud } from "@assistant-ui/react";
import { mainConfig } from "@/lib/config";
import { normalizeAssistantApiKey } from "@/lib/assistant-api-key";

export const POST = async () => {
  const user = await stackServerApp.getUser({ or: "throw" });
  const apiKey = normalizeAssistantApiKey(mainConfig.assistantUI.apiKey);
  const assistantCloud = new AssistantCloud({
    apiKey,
    userId: user.id,
    workspaceId: user.id,
  });
  const { token } = await assistantCloud.auth.tokens.create();
  return new Response(JSON.stringify({ token }), { status: 200 });
};
