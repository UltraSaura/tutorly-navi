import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { useGuardianHomeData } from '@/hooks/useGuardianHomeData';
import { useGuardianLessonData } from '@/hooks/useGuardianLessonData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ChildOverviewCard } from '@/components/guardian/ChildOverviewCard';
import { RecentActivityFeed } from '@/components/guardian/RecentActivityFeed';
import { Skeleton } from '@/components/ui/skeleton';
import { PageMeta } from '@/components/seo/PageMeta';
export default function GuardianHome() {
  const ui = useInterfaceTranslation();
  const {
    guardianId
  } = useGuardianAuth();
  const {
    childrenOverview,
    recentActivity,
    aggregatedStats,
    childUserIds,
    isLoading
  } = useGuardianHomeData(guardianId);
  const { lessonStats, getChildStats } = useGuardianLessonData(guardianId, childUserIds);
  const totalLessonsThisWeek = lessonStats.reduce((sum, stats) => sum + stats.lessonsThisWeek, 0);
  const totalXp = lessonStats.reduce((sum, stats) => sum + stats.totalXp, 0);
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
      <PageMeta title={ui("Guardian Home")} description={ui("Monitor your children's learning progress and recent activity at a glance.")} />
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">{ui("Welcome to Your Guardian Portal")}</h1>
        <p className="text-muted-foreground mt-2">
          {ui("Monitor and support your children's learning journey")}
        </p>
      </div>

      {/* Summary Cards */}
      {aggregatedStats.totalChildren > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ui("Active Children")}</p>
                <p className="text-2xl font-bold">{aggregatedStats.activeChildren}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-green-500/10 p-3">
                <BookOpen className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ui("Exercises This Week")}</p>
                <p className="text-2xl font-bold">{aggregatedStats.exercisesThisWeek}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-cyan-500/10 p-3">
                <TrendingUp className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ui("Quizzes This Week")}</p>
                <p className="text-2xl font-bold">{aggregatedStats.quizAttemptsThisWeek}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-amber-500/10 p-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ui("Need Attention")}</p>
                <p className="text-2xl font-bold">{aggregatedStats.needsAttentionCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg p-3" style={{ background: '#F2FBF8' }}>
                <BookOpen className="h-5 w-5" style={{ color: '#12C6A0' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ui("Leçons cette semaine")}</p>
                <p className="text-2xl font-bold">{totalLessonsThisWeek}</p>
                {totalXp > 0 && (
                  <p className="text-xs text-muted-foreground">{totalXp} {ui("XP total")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Getting Started */}
      {aggregatedStats.totalChildren === 0 ? <Card className="border-primary/50">
          <CardHeader>
            <CardTitle>{ui("Get Started")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {ui("Add your first child to start tracking their learning progress and provide support.")}
            </p>
            <Button asChild>
              <Link to="/guardian/children">
                <Users className="mr-2 h-4 w-4" />
                {ui("Add Your First Child")}
              </Link>
            </Button>
          </CardContent>
        </Card> : <>
          {/* Children Overview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{ui("Your Children")}</h2>
              <Button variant="outline" asChild>
                <Link to="/guardian/children">
                  <Users className="mr-2 h-4 w-4" />
                  {ui("Manage Children")}
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {childrenOverview.map((child) => {
                const lessonData = getChildStats(child.userId);
                return (
                  <div key={child.id} className="relative">
                    <ChildOverviewCard {...child} />
                    {lessonData && (lessonData.lessonsCompleted > 0 || lessonData.currentStreak > 0) && (
                      <div
                        style={{
                          marginTop: -8,
                          background: '#F2FBF8',
                          border: '0.5px solid #9FE1CB',
                          borderRadius: '0 0 12px 12px',
                          padding: '8px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        {lessonData.lessonsThisWeek > 0 && (
                          <span style={{ fontSize: 12, color: '#085041', fontWeight: 600 }}>
                            📚 {ui("lessonsThisWeek", { count: lessonData.lessonsThisWeek })}
                          </span>
                        )}
                        {lessonData.currentStreak > 0 && (
                          <span style={{ fontSize: 12, color: '#B45309', fontWeight: 600 }}>
                            🔥 {ui("dayCount", { count: lessonData.currentStreak })}
                          </span>
                        )}
                        {lessonData.streakAtRisk && (
                          <span style={{ fontSize: 11, color: '#A32D2D', fontWeight: 600 }}>
                            {ui("⚠️ Série en danger")}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: '#667085', marginLeft: 'auto' }}>
                          {lessonData.totalXp} XP
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <RecentActivityFeed activities={recentActivity} loading={isLoading} />
        </>}
    </div>;
}
