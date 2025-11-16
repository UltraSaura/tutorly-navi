import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Search, BookOpen } from 'lucide-react';
import { 
  useTopicObjectives, 
  useObjectivesByCurriculum,
  useLinkObjectiveToTopic,
  useUnlinkObjectiveFromTopic 
} from '@/hooks/useTopicObjectives';

interface TopicObjectivesSelectorProps {
  topicId: string;
  curriculumSubjectId?: string;
  curriculumDomainId?: string;
  curriculumSubdomainId?: string;
}

export function TopicObjectivesSelector({
  topicId,
  curriculumSubjectId,
  curriculumDomainId,
  curriculumSubdomainId,
}: TopicObjectivesSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get currently linked objectives
  const { data: linkedObjectives = [] } = useTopicObjectives(topicId);
  const linkedObjectiveIds = new Set(linkedObjectives.map(o => o.id));
  
  // Get available objectives (filtered by curriculum)
  const { data: availableObjectives = [], isLoading } = useObjectivesByCurriculum({
    subjectId: curriculumSubjectId,
    domainId: curriculumDomainId,
    subdomainId: curriculumSubdomainId,
  });
  
  const linkMutation = useLinkObjectiveToTopic();
  const unlinkMutation = useUnlinkObjectiveFromTopic();
  
  // Filter by search query
  const filteredObjectives = availableObjectives.filter(obj => 
    !linkedObjectiveIds.has(obj.id) && 
    obj.text.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleLink = (objectiveId: string) => {
    const orderIndex = linkedObjectives.length;
    linkMutation.mutate({ topicId, objectiveId, orderIndex });
  };
  
  const handleUnlink = (objectiveId: string) => {
    unlinkMutation.mutate({ topicId, objectiveId });
  };
  
  if (!curriculumSubjectId || !curriculumDomainId || !curriculumSubdomainId) {
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
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Learning Objectives for this Topic
        </CardTitle>
        <CardDescription>
          Select curriculum objectives that students will learn in this topic
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <h4 className="text-sm font-medium mb-2">Add Objectives</h4>
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
