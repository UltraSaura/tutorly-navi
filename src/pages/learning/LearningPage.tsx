import { useNavigate } from 'react-router-dom';
import { useLearningSubjects } from '@/hooks/useLearningSubjects';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { DynamicIcon } from '@/components/admin/subjects/DynamicIcon';
import { toast } from 'sonner';

// Checkmark icon for status
const CheckmarkIcon = ({
  className
}: {
  className?: string;
}) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>;

// Right arrow icon for navigation
const ArrowRightIcon = ({
  className
}: {
  className?: string;
}) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
  </svg>;

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
    '#3B82F6': 'bg-blue-600'
  };
  return colorMap[colorScheme?.toUpperCase()] || 'bg-indigo-600';
};
const LearningPage = () => {
  const navigate = useNavigate();
  const {
    t
  } = useLanguage();
  const {
    data: subjects,
    isLoading
  } = useLearningSubjects();
  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-background pb-20">
        <div className="p-6 pb-4 bg-white dark:bg-card shadow-md">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="py-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 mx-6 my-2 rounded-xl" />)}
        </div>
      </div>;
  }
  const readyCount = subjects?.filter(s => s.videos_ready > 0).length || 0;
  return <div className="min-h-screen bg-gray-50 dark:bg-background pb-20">
      {/* Header */}
      <header className="p-6 pb-4 bg-[#253c7b] shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="font-extrabold text-white text-xl">
            {t('learning.chooseSubject') || 'Choose Your Subject'}
          </h1>
          
        </div>
        
      </header>

      {/* Subject List */}
      <main className="py-4">
        {subjects?.map(({
        subject,
        videos_ready
      }) => {
        const isReady = videos_ready > 0;
        const bgColorClass = getColorClass(subject.color_scheme);
        return <div key={subject.id} onClick={() => {
          if (isReady) {
            navigate(`/learning/${subject.slug}`);
          } else {
            toast.info(`${subject.name} is coming soon!`, {
              description: "We're working hard to bring you this content."
            });
          }
        }} className={`
              flex items-center justify-between 
                p-4 my-2 mx-0 h-24
                ${bgColorClass} text-white 
                rounded-xl shadow-md cursor-pointer
                transition-transform transform 
                hover:scale-[1.01] active:scale-[0.99]
                ${!isReady ? 'opacity-60 cursor-not-allowed' : ''}
              `}>
              {/* Left: Icon + Name */}
              <div className="flex items-center flex-grow">
                <DynamicIcon name={subject.icon_name as any} className="w-10 h-10" />
                <span className="ml-4 text-xl font-semibold">{subject.name}</span>
              </div>
              
              {/* Center: Status Indicator */}
              <div className="flex items-center text-sm font-medium pr-2">
                <CheckmarkIcon className="w-4 h-4 mr-1" />
                {videos_ready} {t('learning.ready') || 'ready'}
              </div>
              
              {/* Right: Arrow */}
              <ArrowRightIcon className="w-6 h-6 text-white ml-2" />
            </div>;
      })}
      </main>
    </div>;
};
export default LearningPage;