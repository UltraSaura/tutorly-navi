import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ActivityItem {
  id: string;
  childName: string;
  childId: string;
  exerciseContent: string;
  subject: string;
  isCorrect: boolean;
  timestamp: string;
  attemptId?: string;
}

interface RecentActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export function RecentActivityFeed({ activities, loading }: RecentActivityFeedProps) {
  const [showAll, setShowAll] = useState(false);
  const ITEMS_TO_SHOW = 8;
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedActivities = showAll ? activities : activities.slice(0, ITEMS_TO_SHOW);
  const groupedActivities = groupActivitiesByDate(displayedActivities);
  const hasMore = activities.length > ITEMS_TO_SHOW;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/guardian/results">
            View All
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity.</p>
            <p className="text-sm mt-1">Encourage your children to practice!</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([dateLabel, items]) => (
                <div key={dateLabel}>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                    {dateLabel}
                  </h4>
                  <div className="space-y-3">
                    {items.map((activity) => (
                      <ActivityCard key={activity.id} activity={activity} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {hasMore && !showAll && (
              <div className="flex justify-center mt-4 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAll(true)}
                >
                  Show More Activities
                </Button>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityCard({ activity }: { activity: ActivityItem }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className={cn(
        "mt-1 flex-shrink-0",
        activity.isCorrect ? "text-green-600" : "text-destructive"
      )}>
        {activity.isCorrect ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <XCircle className="h-5 w-5" />
        )}
      </div>
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm">{activity.childName}</span>
          <span className="text-xs text-muted-foreground">{activity.subject}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {activity.exerciseContent}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function groupActivitiesByDate(activities: ActivityItem[]): Record<string, ActivityItem[]> {
  const grouped: Record<string, ActivityItem[]> = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
  };

  activities.forEach(activity => {
    const date = new Date(activity.timestamp);
    if (isToday(date)) {
      grouped['Today'].push(activity);
    } else if (isYesterday(date)) {
      grouped['Yesterday'].push(activity);
    } else if (isThisWeek(date, { weekStartsOn: 1 })) {
      grouped['This Week'].push(activity);
    }
  });

  // Remove empty groups
  Object.keys(grouped).forEach(key => {
    if (grouped[key].length === 0) {
      delete grouped[key];
    }
  });

  return grouped;
}
