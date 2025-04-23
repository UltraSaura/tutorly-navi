
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ApiKeyManagement from "./ApiKeyManagement";
import ModelSelection from "./ModelSelection";
import SystemPromptConfig from "./SystemPromptConfig";
import { useState } from "react";

// This component gives you tabs for all model-related admin settings.
const AIModelManagement = () => {
  // Tab values match those below for deep linking, if desired.
  const [selectedTab, setSelectedTab] = useState("api-keys");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Model Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage your AI-related integrations, model selection, and prompt templates from one place.
        </p>
      </div>
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="api-keys">API Key Management</TabsTrigger>
          <TabsTrigger value="models">Model Selection</TabsTrigger>
          <TabsTrigger value="prompts">System Prompts</TabsTrigger>
        </TabsList>
        <TabsContent value="api-keys">
          <ApiKeyManagement />
        </TabsContent>
        <TabsContent value="models">
          <ModelSelection />
        </TabsContent>
        <TabsContent value="prompts">
          <SystemPromptConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIModelManagement;
