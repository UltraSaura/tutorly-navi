import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAiModelManagement } from "@/hooks/useAiModelManagement";
import { Trash2, Plus, Key, Settings } from "lucide-react";

const ModelManagementNew = () => {
  const {
    providers,
    models,
    apiKeys,
    loading,
    addApiKey,
    deleteApiKey,
    getModelsByProvider,
    getApiKeysByProvider
  } = useAiModelManagement();

  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [keyName, setKeyName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [isAddKeyOpen, setIsAddKeyOpen] = useState(false);

  const handleAddKey = async () => {
    if (!selectedProvider || !keyName || !keyValue) return;
    
    await addApiKey(selectedProvider, keyName, keyValue);
    
    // Reset form
    setSelectedProvider("");
    setKeyName("");
    setKeyValue("");
    setIsAddKeyOpen(false);
  };

  if (loading) {
    return <div className="p-6">Loading AI model configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Model Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage AI providers, models, and API keys
          </p>
        </div>
        
        <Dialog open={isAddKeyOpen} onOpenChange={setIsAddKeyOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add API Key</DialogTitle>
              <DialogDescription>
                Add a new API key for an AI provider
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="provider">Provider</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Production Key"
                />
              </div>
              <div>
                <Label htmlFor="keyValue">API Key</Label>
                <Input
                  id="keyValue"
                  type="password"
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder="Enter API key"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddKey} disabled={!selectedProvider || !keyName || !keyValue}>
                Add Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {providers.map((provider) => {
          const providerModels = getModelsByProvider(provider.id);
          const providerKeys = getApiKeysByProvider(provider.id);
          
          return (
            <Card key={provider.id} className="w-full">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      {provider.name}
                    </CardTitle>
                    <CardDescription>{provider.api_base_url}</CardDescription>
                  </div>
                  <Badge variant={providerKeys.length > 0 ? "default" : "secondary"}>
                    {providerKeys.length > 0 ? "Configured" : "No API Key"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* API Keys Section */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    API Keys ({providerKeys.length})
                  </h4>
                  {providerKeys.length > 0 ? (
                    <div className="space-y-2">
                      {providerKeys.map((key) => (
                        <div key={key.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="font-medium">{key.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {key.key_value.substring(0, 8)}...
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteApiKey(key.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No API keys configured</p>
                  )}
                </div>

                {/* Available Models Section */}
                <div>
                  <h4 className="font-medium mb-2">Available Models ({providerModels.length})</h4>
                  {providerModels.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {providerModels.map((model) => (
                        <div key={model.id} className="p-2 border rounded">
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground">{model.model_id}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {model.capabilities.map((capability) => (
                              <Badge key={capability} variant="outline" className="text-xs">
                                {capability}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No models available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ModelManagementNew;