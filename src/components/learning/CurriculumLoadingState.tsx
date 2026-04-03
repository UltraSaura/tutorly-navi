import { Skeleton } from '@/components/ui/skeleton';

export const CurriculumLoadingState = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-background pb-20">
    <div className="p-6 pb-4 bg-white dark:bg-card shadow-md">
      <Skeleton className="h-10 w-64 mb-2" />
      <Skeleton className="h-4 w-96" />
    </div>
    <div className="py-4 space-y-2 px-6">
      {[1, 2, 3, 4, 5].map(i => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  </div>
);
