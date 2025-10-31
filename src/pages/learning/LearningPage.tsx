import { useNavigate } from 'react-router-dom';
import { useLearningSubjects } from '@/hooks/useLearningSubjects';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { DynamicIcon } from '@/components/admin/subjects/DynamicIcon';
import { toast } from 'sonner';

// Map hex colors to Tailwind background classes
const getColorClass = (colorScheme: string): string => {
  const colorMap: Record<string, string> = {
    '#4F46E5': 'bg-indigo-600',
    '#6366F1': 'bg-indigo-600',
    '#8B5CF6': 'bg-violet-600',
    '#A855F7': 'bg-purple-600',
    '#D946EF': 'bg-fuchsia-600',
    '#EC4899': 'bg-pink-600',
    '#F43F5E': 'bg-rose-600',
    '#EF4444': 'bg-red-600',
    '#F97316': 'bg-orange-600',
    '#F59E0B': 'bg-amber-600',
    '#EAB308': 'bg-yellow-600',
    '#84CC16': 'bg-lime-600',
    '#22C55E': 'bg-green-600',
    '#10B981': 'bg-emerald-600',
    '#14B8A6': 'bg-teal-600',
    '#06B6D4': 'bg-cyan-600',
    '#0EA5E9': 'bg-sky-600',
    '#3B82F6': 'bg-blue-600',
  };
  
  return colorMap[colorScheme?.toUpperCase()] || 'bg-indigo-600';
};

const LearningPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: subjects, isLoading } = useLearningSubjects();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background pb-20">
        <div className="p-6 pb-4 bg-white dark:bg-card shadow-md">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const readyCount = subjects?.filter(s => s.videos_ready > 0).length || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background pb-20">
      {/* Header */}
      <header className="p-6 pb-4 bg-white dark:bg-card shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-400">
            {t('learning.chooseSubject') || 'Choose Your Subject'}
          </h1>
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {readyCount} ready
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          {t('learning.selectSubject') || 'Select a subject to begin exploring learning resources.'}
        </p>
      </header>

      {/* Subject Grid */}
      <main className="p-6 grid grid-cols-2 gap-4">
        {subjects?.map(({ subject, videos_ready }) => {
          const isReady = videos_ready > 0;
          const bgColorClass = getColorClass(subject.color_scheme);
          
          return (
            <div
              key={subject.id}
              onClick={() => {
                if (isReady) {
                  navigate(`/learning/${subject.slug}`);
                } else {
                  toast.info(`${subject.name} is coming soon!`, {
                    description: "We're working hard to bring you this content."
                  });
                }
              }}
              className={`
                relative flex flex-col items-center justify-center 
                p-4 h-36 w-full ${bgColorClass} text-white 
                rounded-xl shadow-lg transition-transform transform 
                hover:scale-[1.03] active:scale-[0.98]
                ${isReady ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}
              `}
            >
              {/* Icon with white circle background */}
              <div className="p-4 rounded-full bg-white bg-opacity-20 mb-3">
                <DynamicIcon 
                  name={subject.icon_name as any} 
                  className="w-8 h-8" 
                />
              </div>
              
              {/* Subject Name */}
              <span className="text-xl font-semibold text-center line-clamp-1 px-2">
                {subject.name}
              </span>
              
              {/* Status Badge */}
              <div className={`
                absolute top-2 right-2 flex items-center 
                text-xs font-medium px-2 py-0.5 rounded-full 
                ${isReady 
                  ? 'bg-white text-indigo-700' 
                  : 'bg-gray-300 text-gray-700'
                }
              `}>
                {isReady ? 'Ready' : 'Coming soon'}
                <span className={`
                  ml-1 w-2 h-2 rounded-full 
                  ${isReady ? 'bg-green-400' : 'bg-gray-500'}
                `} />
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default LearningPage;
