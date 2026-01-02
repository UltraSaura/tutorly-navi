import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Search, BookOpen, Sparkles, Check, Loader2 } from 'lucide-react';
import { 
  useTopicObjectives, 
  useObjectivesByCurriculum,
  useLinkObjectiveToTopic,
  useUnlinkObjectiveFromTopic 
} from '@/hooks/useTopicObjectives';
import { useAutoSuggestObjectives, ObjectiveSuggestion } from '@/hooks/useAutoSuggestObjectives';
import { cn } from '@/lib/utils';

interface TopicObjectivesSelectorProps {
  topicId: string;
  topicName?: string;
  topicDescription?: string;
  curriculumSubjectId?: string;
  curriculumDomainId?: string;
  curriculumSubdomainId?: string;
  curriculumLevelCode?: string;
  curriculumCountryCode?: string;
}

export function TopicObjectivesSelector({
  topicId,
  topicName,
  topicDescription,
  curriculumSubjectId,
  curriculumDomainId,
  curriculumSubdomainId,
  curriculumLevelCode,
  curriculumCountryCode,
}: TopicObjectivesSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ObjectiveSuggestion[]>([]);
  
  // Get currently linked objectives
  const { data: linkedObjectives = [] } = useTopicObjectives(topicId);
  const linkedObjectiveIds = new Set(linkedObjectives.map(o => o.id));
  
  // Get available objectives (filtered by curriculum with legacy fallback)
  const { data: availableObjectives = [], isLoading } = useObjectivesByCurriculum({
    subjectId: curriculumSubjectId,
    domainId: curriculumDomainId,
    subdomainId: curriculumSubdomainId,
    levelCode: curriculumLevelCode,
  });
  
  const linkMutation = useLinkObjectiveToTopic();
  const unlinkMutation = useUnlinkObjectiveFromTopic();
  const suggestMutation = useAutoSuggestObjectives();
  
  // Filter by search query
  const filteredObjectives = availableObjectives.filter(obj => 
    !linkedObjectiveIds.has(obj.id) && 
    obj.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter out already-linked objectives from suggestions
  const filteredSuggestions = suggestions.filter(s => !linkedObjectiveIds.has(s.objective_id));
  
  const handleLink = (objectiveId: string) => {
    const orderIndex = linkedObjectives.length;
    linkMutation.mutate({ topicId, objectiveId, orderIndex });
    // Remove from suggestions if it was there
    setSuggestions(prev => prev.filter(s => s.objective_id !== objectiveId));
  };
  
  const handleUnlink = (objectiveId: string) => {
    unlinkMutation.mutate({ topicId, objectiveId });
  };

  const handleSuggest = async () => {
    if (!topicName) return;
    
    const result = await suggestMutation.mutateAsync({
      topicName,
      topicDescription,
      levelCode: curriculumLevelCode,
      countryCode: curriculumCountryCode,
    });
    
    setSuggestions(result.suggestions || []);
  };

  const handleAcceptAll = () => {
    filteredSuggestions.forEach(s => {
      handleLink(s.objective_id);
    });
    setSuggestions([]);
  };

  const handleClearSuggestions = () => {
    setSuggestions([]);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return <Badge variant="default" className="bg-green-500/20 text-green-700 border-green-500/30">High {Math.round(confidence * 100)}%</Badge>;
    } else if (confidence >= 0.7) {
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Medium {Math.round(confidence * 100)}%</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">{Math.round(confidence * 100)}%</Badge>;
  };
  
  // Show message if no curriculum info at all
  const hasCurriculumFilters = (curriculumSubjectId && curriculumDomainId && curriculumSubdomainId) || curriculumLevelCode;
  
  if (!hasCurriculumFilters) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Learning Objectives</CardTitle>
          <CardDescription>
            Please set the curriculum location first to select objectives
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Learning Objectives for this Topic
            </CardTitle>
            <CardDescription>
              Select curriculum objectives that students will learn in this topic
            </CardDescription>
          </div>
          {topicName && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSuggest}
              disabled={suggestMutation.isPending}
              className="gap-2"
            >
              {suggestMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Suggest Objectives
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Suggestions Section */}
        {filteredSuggestions.length > 0 && (
          <div className="border rounded-lg p-3 bg-primary/5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Suggestions ({filteredSuggestions.length})
              </h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleAcceptAll}>
                  <Check className="w-3 h-3 mr-1" />
                  Accept All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearSuggestions}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {filteredSuggestions.map((suggestion) => (
                <div 
                  key={suggestion.objective_id} 
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-lg border bg-background",
                    suggestion.confidence >= 0.9 && "border-green-500/30",
                    suggestion.confidence >= 0.7 && suggestion.confidence < 0.9 && "border-yellow-500/30"
                  )}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{suggestion.objective_id}</Badge>
                      {getConfidenceBadge(suggestion.confidence)}
                      <span className="text-xs text-muted-foreground">
                        {suggestion.domain} → {suggestion.subdomain}
                      </span>
                    </div>
                    <p className="text-sm">{suggestion.objective_text}</p>
                    <p className="text-xs text-muted-foreground italic">{suggestion.reason}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLink(suggestion.objective_id)}
                    disabled={linkMutation.isPending}
                    className="shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Currently Linked Objectives */}
        <div>
          <h4 className="text-sm font-medium mb-2">Linked Objectives ({linkedObjectives.length})</h4>
          {linkedObjectives.length === 0 ? (
            <p className="text-sm text-muted-foreground">No objectives linked yet</p>
          ) : (
            <div className="space-y-2">
              {linkedObjectives.map((objective) => (
                <div key={objective.id} className="flex items-start gap-2 p-3 border rounded-lg bg-muted/50">
                  <Badge variant="outline" className="mt-0.5">{objective.id}</Badge>
                  <p className="flex-1 text-sm">{objective.text}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlink(objective.id)}
                    disabled={unlinkMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Add New Objectives */}
        <div>
          <h4 className="text-sm font-medium mb-2">Add Objectives Manually</h4>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search objectives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <ScrollArea className="h-64 border rounded-lg p-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground p-2">Loading objectives...</p>
              ) : filteredObjectives.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">
                  {searchQuery ? 'No matching objectives found' : 'All objectives already linked'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredObjectives.map((objective) => (
                    <div key={objective.id} className="flex items-start gap-2 p-2 hover:bg-muted rounded-lg transition-colors">
                      <Badge variant="secondary" className="mt-0.5">{objective.id}</Badge>
                      <p className="flex-1 text-sm">{objective.text}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLink(objective.id)}
                        disabled={linkMutation.isPending}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
