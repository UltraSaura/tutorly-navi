
import { useState } from 'react';
import { Check, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: string[];
  contextWindow: number;
  pricing: string;
  performance: {
    speed: number;
    quality: number;
    reasoning: number;
  };
  bestFor: string[];
}

const models: ModelOption[] = [
  {
    id: 'gpt4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Most advanced multimodal model with vision and audio capabilities',
    capabilities: ['Text generation', 'Image understanding', 'Code generation', 'Reasoning'],
    contextWindow: 128000,
    pricing: '$0.01 / 1K tokens',
    performance: {
      speed: 85,
      quality: 95,
      reasoning: 90,
    },
    bestFor: ['Complex tutoring scenarios', 'Image-based homework help', 'Detailed explanations'],
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    description: 'Powerful multimodal model with strong reasoning capabilities',
    capabilities: ['Text generation', 'Image understanding', 'Code generation'],
    contextWindow: 32000,
    pricing: '$0.0025 / 1K tokens',
    performance: {
      speed: 90,
      quality: 85,
      reasoning: 80,
    },
    bestFor: ['Math problem solving', 'Science explanations', 'Cost-effective tutoring'],
  },
  {
    id: 'claude-3',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Excellent at nuanced instructions and long-form content',
    capabilities: ['Text generation', 'Image understanding', 'Detailed explanations'],
    contextWindow: 200000,
    pricing: '$0.015 / 1K tokens',
    performance: {
      speed: 75,
      quality: 90,
      reasoning: 95,
    },
    bestFor: ['Essay feedback', 'Detailed concept explanations', 'Research assistance'],
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'Mistral AI',
    description: 'Efficient model with strong reasoning at a lower cost',
    capabilities: ['Text generation', 'Code assistance', 'Structured output'],
    contextWindow: 32000,
    pricing: '$0.0035 / 1K tokens',
    performance: {
      speed: 88,
      quality: 82,
      reasoning: 85,
    },
    bestFor: ['Basic tutoring tasks', 'Quick answers', 'Budget-friendly option'],
  },
];

const ModelSelection = () => {
  const [selectedModel, setSelectedModel] = useState('gpt4o');
  const [openedDetails, setOpenedDetails] = useState<string[]>([]);
  
  const toggleDetails = (id: string) => {
    if (openedDetails.includes(id)) {
      setOpenedDetails(openedDetails.filter(item => item !== id));
    } else {
      setOpenedDetails([...openedDetails, id]);
    }
  };
  
  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    const model = models.find(m => m.id === value);
    toast.success(`${model?.name} selected as the active model`);
  };
  
  const getPerformanceColor = (value: number) => {
    if (value >= 90) return 'bg-green-500';
    if (value >= 80) return 'bg-blue-500';
    if (value >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Model Selection</h1>
        <p className="text-muted-foreground mt-1">
          Choose which AI model to use for tutoring
        </p>
      </div>
      
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-semibold mb-4">Current Active Model</h2>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-studywhiz-100 dark:bg-studywhiz-900/20 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-studywhiz-500"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{models.find(m => m.id === selectedModel)?.name}</h3>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {models.find(m => m.id === selectedModel)?.provider}
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Available Models</h2>
        <RadioGroup value={selectedModel} onValueChange={handleModelChange} className="space-y-4">
          {models.map((model) => (
            <div key={model.id} className="relative">
              <Collapsible 
                open={openedDetails.includes(model.id)} 
                onOpenChange={() => toggleDetails(model.id)}
                className="w-full"
              >
                <Card className={`glass ${selectedModel === model.id ? 'border-studywhiz-500 dark:border-studywhiz-500' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value={model.id} id={model.id} className="data-[state=checked]:border-studywhiz-500 data-[state=checked]:text-studywhiz-500" />
                        <div>
                          <CardTitle className="text-lg">{model.name}</CardTitle>
                          <CardDescription>{model.provider}</CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {selectedModel === model.id && (
                          <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400 font-normal">
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Active
                          </Badge>
                        )}
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {openedDetails.includes(model.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
                  </CardHeader>
                  
                  <CollapsibleContent>
                    <Separator />
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Capabilities</h4>
                          <div className="flex flex-wrap gap-2">
                            {model.capabilities.map((capability, idx) => (
                              <Badge key={idx} variant="secondary" className="font-normal">
                                {capability}
                              </Badge>
                            ))}
                          </div>
                          
                          <h4 className="text-sm font-medium mt-4 mb-2">Best For</h4>
                          <ul className="text-sm space-y-1 list-disc pl-5">
                            {model.bestFor.map((use, idx) => (
                              <li key={idx}>{use}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-2">Performance</h4>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Speed</span>
                                <span>{model.performance.speed}/100</span>
                              </div>
                              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full">
                                <div 
                                  className={`h-full rounded-full ${getPerformanceColor(model.performance.speed)}`}
                                  style={{ width: `${model.performance.speed}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Output Quality</span>
                                <span>{model.performance.quality}/100</span>
                              </div>
                              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full">
                                <div 
                                  className={`h-full rounded-full ${getPerformanceColor(model.performance.quality)}`}
                                  style={{ width: `${model.performance.quality}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Reasoning</span>
                                <span>{model.performance.reasoning}/100</span>
                              </div>
                              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full">
                                <div 
                                  className={`h-full rounded-full ${getPerformanceColor(model.performance.reasoning)}`}
                                  style={{ width: `${model.performance.reasoning}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium">Context Window:</span>
                              <span className="text-sm">{(model.contextWindow / 1000).toFixed(0)}K tokens</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs max-w-xs">
                                      This represents how much text the model can process at once, affecting its ability to understand complex questions or lengthy conversations.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            
                            <div className="text-sm">
                              <span className="font-medium">Pricing:</span> {model.pricing}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-4">
                        {selectedModel !== model.id && (
                          <Button 
                            className="bg-studywhiz-600 hover:bg-studywhiz-700"
                            onClick={() => handleModelChange(model.id)}
                          >
                            Set as Active
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
};

export default ModelSelection;
