import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, TrendingUp, AlertCircle, FileText, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function GuardianHome() {
  const { guardianId } = useGuardianAuth();

  // Fetch children count
  const { data: childrenData } = useQuery({
    queryKey: ['guardian-children-count', guardianId],
    queryFn: async () => {
      if (!guardianId) return null;
      
      const { data, error } = await supabase
        .from('guardian_child_links')
        .select('child_id, children!inner(user_id, status)')
        .eq('guardian_id', guardianId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!guardianId,
  });

  const totalChildren = childrenData?.length || 0;
  const activeChildren = childrenData?.filter(c => c.children?.status === 'active')?.length || 0;

  // Fetch exercises this week
  const { data: exercisesThisWeek } = useQuery({
    queryKey: ['guardian-exercises-week', guardianId],
    queryFn: async () => {
      if (!guardianId || !childrenData) return 0;
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const childUserIds = childrenData.map(c => c.children?.user_id).filter(Boolean);
      
      if (childUserIds.length === 0) return 0;
      
      const { data, error } = await supabase
        .from('exercise_history')
        .select('id')
        .in('user_id', childUserIds)
        .gte('created_at', sevenDaysAgo.toISOString());
      
      if (error) {
        console.error('Error fetching exercises this week:', error);
        return 0;
      }
      
      return data?.length || 0;
    },
    enabled: !!guardianId && !!childrenData,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome to Your Guardian Portal</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and support your children's learning journey
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChildren}</div>
            <p className="text-xs text-muted-foreground">
              {activeChildren} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exercises This Week</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exercisesThisWeek ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Past 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">All caught up!</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with common tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button asChild>
            <Link to="/guardian/children">
              <Users className="mr-2 h-4 w-4" />
              Manage Children
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/guardian/results">
              <FileText className="mr-2 h-4 w-4" />
              View Results
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/guardian/explanations">
              <Lightbulb className="mr-2 h-4 w-4" />
              See Explanations
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Getting Started */}
      {totalChildren === 0 && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              You haven't added any children yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Add your first child to start tracking their learning progress and provide support.
            </p>
            <Button asChild>
              <Link to="/guardian/children">
                Add Your First Child
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
