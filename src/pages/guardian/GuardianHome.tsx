import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { useGuardianHomeData } from '@/hooks/useGuardianHomeData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ChildOverviewCard } from '@/components/guardian/ChildOverviewCard';
import { RecentActivityFeed } from '@/components/guardian/RecentActivityFeed';
import { Skeleton } from '@/components/ui/skeleton';
export default function GuardianHome() {
  const {
    guardianId
  } = useGuardianAuth();
  const {
    childrenOverview,
    recentActivity,
    aggregatedStats,
    isLoading
  } = useGuardianHomeData(guardianId);
  if (isLoading) {
    return <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>;
  }
  return <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome to Your Guardian Portal</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and support your children's learning journey
        </p>
      </div>

      {/* Summary Cards */}
      

      {/* Getting Started */}
      {aggregatedStats.totalChildren === 0 ? <Card className="border-primary/50">
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Add your first child to start tracking their learning progress and provide support.
            </p>
            <Button asChild>
              <Link to="/guardian/children">
                <Users className="mr-2 h-4 w-4" />
                Add Your First Child
              </Link>
            </Button>
          </CardContent>
        </Card> : <>
          {/* Children Overview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Children</h2>
              <Button variant="outline" asChild>
                <Link to="/guardian/children">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Children
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {childrenOverview.map(child => <ChildOverviewCard key={child.id} {...child} />)}
            </div>
          </div>

          {/* Recent Activity */}
          <RecentActivityFeed activities={recentActivity} loading={isLoading} />
        </>}
    </div>;
}