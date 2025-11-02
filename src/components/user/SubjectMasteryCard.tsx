import { useLanguage } from '@/context/SimpleLanguageContext';

interface SubjectMasteryCardProps {
  percentage: number;
  completedTopics: number;
  totalTopics: number;
  colorScheme?: string;
}

export function SubjectMasteryCard({ 
  percentage, 
  completedTopics, 
  totalTopics,
  colorScheme = '#7c3aed' // Default purple
}: SubjectMasteryCardProps) {
  const { t } = useLanguage();

  return (
    <div 
      className="p-6 text-white shadow-lg rounded-lg" 
      style={{ backgroundColor: colorScheme }}
    >
      <h2 className="text-3xl font-extrabold mb-1">
        {t('learning.subjectMastery') || 'Subject Mastery'}
      </h2>
      <p className="text-sm opacity-90 mb-3">
        {t('learning.yourProgress') || 'Your overall progress in this subject'}
      </p>
      
      <div className="w-full bg-white/30 rounded-full h-3 mt-3">
        <div 
          className="h-3 rounded-full bg-white shadow-inner transition-all" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-lg font-bold mt-2">
        {percentage}% {t('learning.complete') || 'Complete'}
      </p>
      <p className="text-sm opacity-90">
        {completedTopics}/{totalTopics} {t('learning.topicsMastered') || 'topics mastered'}
      </p>
    </div>
  );
}
