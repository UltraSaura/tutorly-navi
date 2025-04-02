
import React, { useState, useMemo } from 'react';
import { Check, Info, ThumbsUp, Zap, BrainCircuit, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const ModelSelection = () => {
  const { getAvailableModels, selectedModelId, setSelectedModelId } = useAdmin();
  const unsortedModels = getAvailableModels();
  
  // Sort models to put the selected model first
  const models = useMemo(() => {
    return [...unsortedModels].sort((a, b) => {
      if (a.id === selectedModelId) return -1;
      if (b.id === selectedModelId) return 1;
      return 0;
    });
  }, [unsortedModels, selectedModelId]);
  
  // State to track which model details are expanded - initialize all to false
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>(
    Object.fromEntries(models.map(model => [model.id, false]))
  );

  // Toggle expansion state for a specific model
  const toggleModelExpansion = (modelId: string) => {
    setExpandedModels(prev => ({
      ...prev,
      [modelId]: !prev[modelId]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Model Selection</h1>
        <p className="text-muted-foreground mt-1">
          Choose the AI model that best fits your educational needs
        </p>
      </div>

      <Alert variant="default" className="bg-muted/50">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Models are filtered based on available API keys. Add API keys in the API Key Management section.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {models.map(model => {
          const isSelected = model.id === selectedModelId;
          const isDisabled = model.disabled;
          const isExpanded = expandedModels[model.id];

          return (
            <Card 
              key={model.id} 
              className={`transition-all ${isSelected ? 'border-primary ring-2 ring-primary/20' : ''} ${isDisabled ? 'opacity-60' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {model.name}
                      {isSelected && <Check className="text-primary h-5 w-5" />}
                    </CardTitle>
                    <CardDescription>{model.provider}</CardDescription>
                  </div>
                  <Badge variant={isDisabled ? "outline" : "default"}>
                    {isDisabled ? "Key Required" : "Available"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <Collapsible open={isExpanded} onOpenChange={() => toggleModelExpansion(model.id)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center w-full justify-center hover:bg-muted/50">
                      <span className="text-xs text-muted-foreground">
                        {isExpanded ? "Hide details" : "Show details"}
                      </span>
                      {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <p className="text-sm text-muted-foreground mb-4">{model.description}</p>
                    
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {model.capabilities.map((capability, idx) => (
                          <Badge key={idx} variant="secondary" className="font-normal">
                            {capability}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Speed</span>
                            <span>{model.performance.speed}%</span>
                          </div>
                          <Progress value={model.performance.speed} className="h-1.5" />
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> Quality</span>
                            <span>{model.performance.quality}%</span>
                          </div>
                          <Progress value={model.performance.quality} className="h-1.5" />
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1"><BrainCircuit className="h-3 w-3" /> Reasoning</span>
                            <span>{model.performance.reasoning}%</span>
                          </div>
                          <Progress value={model.performance.reasoning} className="h-1.5" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Context Window</p>
                          <p className="font-medium">{(model.contextWindow/1000).toFixed(0)}K tokens</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Pricing</p>
                          <p className="font-medium">{model.pricing}</p>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
              
              <CardFooter>
                <div className="w-full flex justify-between items-center gap-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          <span>Best for: {model.bestFor[0]}{model.bestFor.length > 1 ? '...' : ''}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <ul className="text-xs list-disc pl-5 space-y-1">
                          {model.bestFor.map((use, idx) => (
                            <li key={idx}>{use}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <Button 
                    onClick={() => setSelectedModelId(model.id)} 
                    disabled={isDisabled || isSelected}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                  >
                    {isSelected ? "Selected" : "Select Model"}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ModelSelection;
