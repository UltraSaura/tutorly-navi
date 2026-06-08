import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Play, CheckCircle2, Lock } from 'lucide-react';
import { useSubjectDashboard } from '@/hooks/useSubjectDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { PageMeta } from '@/components/seo/PageMeta';

const SubjectDashboardPage = () => {
  const { subjectSlug } = useParams<{ subjectSlug: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useSubjectDashboard(subjectSlug || '');

  if (isLoading) {
    return (
      <div style={{ background: '#F3F6FA', minHeight: '100vh', paddingBottom: 96 }}>
        <div style={{ background: 'white', padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '0.5px solid #EAECEF' }}>
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-20 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!data?.subject) {
    return (
      <div style={{ background: '#F3F6FA', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#667085', fontFamily: 'Poppins, sans-serif' }}>Sujet introuvable</p>
      </div>
    );
  }

  const { subject, categories, overallProgress } = data;
  const allTopics = categories.flatMap((category) => (category.topics || []) as any[]);
  const lessonsAvailable = allTopics.filter((topic: any) => topic.has_lesson).length;
  const lessonsCompleted = allTopics.filter((topic: any) => topic.lesson_completed).length;

  return (
    <div style={{ background: '#F3F6FA', minHeight: '100vh', paddingBottom: 96 }}>
      <PageMeta title={subject.name} description={`Lecons et exercices - ${subject.name}`} />

      <div style={{ background: 'white', borderBottom: '0.5px solid #EAECEF', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/learning')}
            aria-label="Retour"
            style={{ width: 28, height: 28, borderRadius: '50%', border: '0.5px solid #EAECEF', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <ArrowLeft className="h-3.5 w-3.5" style={{ color: '#667085' }} />
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif' }}>
              {subject.name}
            </p>
          </div>
          {lessonsAvailable > 0 && (
            <span style={{ background: '#F2FBF8', color: '#085041', border: '0.5px solid #9FE1CB', borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
              {lessonsCompleted}/{lessonsAvailable} lecons
            </span>
          )}
        </div>

        {overallProgress.totalTopics > 0 && (
          <div style={{ padding: '0 16px 10px' }}>
            <div style={{ height: 4, background: '#EAECEF', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${overallProgress.percentage}%`, height: '100%', background: '#12C6A0', borderRadius: 999, transition: 'width 0.4s ease' }} />
            </div>
            <p style={{ fontSize: 10, color: '#667085', margin: '3px 0 0', fontFamily: 'Poppins, sans-serif' }}>
              {overallProgress.completedTopics}/{overallProgress.totalTopics} termines
            </p>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map((category: any) =>
          (category.topics || []).map((topic: any) => {
            const hasLesson = !!topic.has_lesson;
            const isCompleted = !!topic.lesson_completed;
            const hasVideos = (topic.video_count || 0) > 0;
            const isAccessible = hasLesson || hasVideos;

            return (
              <button
                key={topic.id}
                onClick={() => isAccessible && navigate(`/learning/${subjectSlug}/${topic.slug}`)}
                disabled={!isAccessible}
                style={{
                  width: '100%',
                  background: 'white',
                  borderRadius: 14,
                  border: `1px solid ${isCompleted ? '#9FE1CB' : '#EAECEF'}`,
                  padding: '12px 14px',
                  cursor: isAccessible ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  opacity: isAccessible ? 1 : 0.5,
                  transition: 'box-shadow 0.15s',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: isCompleted ? '#F2FBF8' : hasLesson ? '#F3F6FA' : '#F9F9F9',
                    border: `1px solid ${isCompleted ? '#9FE1CB' : '#EAECEF'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" style={{ color: '#12C6A0' }} />
                  ) : hasLesson ? (
                    <BookOpen className="h-4.5 w-4.5" style={{ color: '#667085' }} />
                  ) : hasVideos ? (
                    <Play className="h-4.5 w-4.5" style={{ color: '#667085' }} />
                  ) : (
                    <Lock className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px', fontFamily: 'Poppins, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {topic.name}
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {hasLesson && (
                      <span style={{ background: '#F2FBF8', color: '#085041', border: '0.5px solid #9FE1CB', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
                        Lecon
                      </span>
                    )}
                    {hasVideos && (
                      <span style={{ background: '#F3F6FA', color: '#667085', border: '0.5px solid #EAECEF', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
                        {topic.video_count} video{topic.video_count > 1 ? 's' : ''}
                      </span>
                    )}
                    {!hasLesson && !hasVideos && (
                      <span style={{ color: '#9CA3AF', fontSize: 10 }}>Bientot disponible</span>
                    )}
                  </div>
                </div>

                {isAccessible && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M6 4l4 4-4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SubjectDashboardPage;
