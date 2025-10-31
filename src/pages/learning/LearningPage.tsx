import { useNavigate } from 'react-router-dom';
import { useLearningSubjects } from '@/hooks/useLearningSubjects';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { DynamicIcon } from '@/components/admin/subjects/DynamicIcon';

// Map color_scheme hex to Tailwind background classes
const getColorClass = (colorScheme: string): string => {
  const colorMap: Record<string, string> = {
    '#4F46E5': 'bg-indigo-600',
    '#059669': 'bg-green-600',
    '#0284C7': 'bg-sky-600',
    '#DB2777': 'bg-pink-600',
    '#CA8A04': 'bg-yellow-600',
    '#9333EA': 'bg-purple-600',
    '#65A30D': 'bg-lime-600',
    '#EA580C': 'bg-orange-600',
  };
  return colorMap[colorScheme.toUpperCase()] || 'bg-indigo-600';
};

const LearningPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: subjects, isLoading } = useLearningSubjects();

  const readyCount = subjects?.filter(s => s.videos_ready > 0).length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="p-6 pb-4 bg-white shadow-md">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </header>
        <main className="p-6 grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="p-6 pb-4 bg-white shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-indigo-700">
            {t('learning.chooseSubject') || 'Choose Your Subject'}
          </h1>
          <div className="text-sm font-medium text-gray-500">
            {readyCount} ready
          </div>
        </div>
        <p className="text-gray-500 mt-1">
          {t('learning.selectSubject') || 'Select a subject to begin exploring learning resources.'}
        </p>
      </header>

      {/* Subject Grid - 2 columns */}
      <main className="p-6 grid grid-cols-2 gap-4">
        {subjects?.map(({ subject, videos_ready }) => {
          const isReady = videos_ready > 0;
          const bgColorClass = getColorClass(subject.color_scheme);
          
          return (
            <div
              key={subject.id}
              onClick={() => isReady && navigate(`/learning/${subject.slug}`)}
              className={`
                relative flex flex-col items-center justify-center 
                p-4 h-36 w-full ${bgColorClass} text-white 
                rounded-xl shadow-lg transition-transform transform 
                hover:scale-[1.03] active:scale-[0.98] cursor-pointer 
                ${!isReady ? 'opacity-60 cursor-not-allowed' : ''}
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
              <span className="text-xl font-semibold text-center">
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
