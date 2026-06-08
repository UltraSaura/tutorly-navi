import { ArrowLeft } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCoursePlaylist } from '@/hooks/useCoursePlaylist';
import { useAllBanks } from '@/hooks/useQuizBank';
import { useAuth } from '@/context/AuthContext';
import { VideoPlayerBox } from '@/components/learning/VideoPlayerBox';
import { LessonStepper } from '@/components/learning/LessonStepper';
import { PageMeta } from '@/components/seo/PageMeta';
import { Skeleton } from '@/components/ui/skeleton';
import type { LessonContent } from '@/types/learning';

export default function LessonPage() {
  const { subjectSlug, topicSlug } = useParams<{
    subjectSlug: string;
    topicSlug: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [completedVideoIds, setCompletedVideoIds] = useState<string[]>([]);

  const { data, isLoading } = useCoursePlaylist(topicSlug || '');
  const topic = data?.topic ?? null;
  const videos = data?.videos ?? [];

  const { data: banksData } = useAllBanks(
    topic?.id ?? '',
    playingVideoId ?? '',
    completedVideoIds,
    user?.id ?? ''
  );
  const allBanks = banksData?.banks ?? [];

  // ── Set the first video as playing when videos load ───────
  useEffect(() => {
    if (videos.length > 0 && !playingVideoId) {
      setPlayingVideoId(videos[0].id);
    }
  }, [videos.length, playingVideoId, videos]);

  // ── When a video ends: mark as completed and advance ─────
  const handleVideoEnd = useCallback(() => {
    if (!playingVideoId) return;
    setCompletedVideoIds(prev => [...new Set([...prev, playingVideoId])]);
    const currentIndex = videos.findIndex(v => v.id === playingVideoId);
    if (currentIndex >= 0 && currentIndex < videos.length - 1) {
      setPlayingVideoId(videos[currentIndex + 1].id);
    }
  }, [playingVideoId, videos]);

  // ── Navigate to practice when S'exercer is tapped ────────
  const handleSexercer = useCallback(async () => {
    if (!topic?.id) return;
    const topicBank = allBanks.find(
      (bank) => bank.topicId === topic.id && !bank.triggerVideoId && bank.isUnlocked
    );
    if (topicBank) {
      navigate(`/practice/${subjectSlug}?quiz=${topicBank.bankId}`);
    } else {
      navigate(`/practice/${subjectSlug}`);
    }
  }, [allBanks, topic, subjectSlug, navigate]);

  // ── Derived state ─────────────────────────────────────────
  const hasVideos = videos.length > 0;
  const hasMultipleVideos = videos.length > 1;
  const lessonContent = topic?.lesson_content as LessonContent | null;
  const inlineBank = allBanks.find(
    (bank) => bank.topicId === topic?.id && !bank.triggerVideoId && bank.isUnlocked
  );

  // ── Loading state ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#F3F6FA' }}>
        <div style={{ background: 'white', padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '0.5px solid #EAECEF' }}>
          <Skeleton className="h-7 w-7 rounded-full" />
          <div style={{ flex: 1 }}>
            <Skeleton className="mb-1 h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F3F6FA' }}>
      <PageMeta
        title={topic?.name ?? 'Leçon'}
        description={topic?.description ?? ''}
      />

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ background: 'white', borderBottom: '0.5px solid #EAECEF', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate(-1)}
            aria-label="Retour"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '0.5px solid #EAECEF', background: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" style={{ color: '#667085' }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {topic?.name ?? '…'}
            </p>
            <p style={{ fontSize: 10, color: '#667085', margin: 0 }}>Leçons · Mathématiques</p>
          </div>
          {hasVideos && (
            <span style={{ background: '#FAEEDA', color: '#633806', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, flexShrink: 0 }}>
              {videos.length} vidéo{videos.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* ── Content badges (show what's available) ─────── */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px 0', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F2FBF8', color: '#085041', border: '0.5px solid #9FE1CB', borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 600 }}>
            ✓ Leçon
          </span>
          {hasVideos && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F2FBF8', color: '#085041', border: '0.5px solid #9FE1CB', borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 600 }}>
              ✓ {videos.length} vidéo{videos.length > 1 ? 's' : ''}
            </span>
          )}
          {!hasVideos && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F3F6FA', color: '#9CA3AF', border: '0.5px solid #EAECEF', borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 600 }}>
              Pas encore de vidéo
            </span>
          )}
        </div>

        {/* ── VIDEO SECTION — only rendered if videos exist ─── */}
        {hasVideos && playingVideoId && (
          <div style={{ padding: '10px 16px 0' }}>
            <div style={{ borderRadius: 14, overflow: 'hidden' }}>
              <VideoPlayerBox
                videoId={playingVideoId}
                onVideoEnd={handleVideoEnd}
                autoPlay={false}
              />
            </div>

            {/* Playlist — only shown if topic has multiple videos */}
            {hasMultipleVideos && (
              <div style={{ marginTop: 8, background: 'white', borderRadius: 12, border: '0.5px solid #EAECEF', overflow: 'hidden' }}>
                {videos.map((video, index) => {
                  const isPlaying = video.id === playingVideoId;
                  const isDone = completedVideoIds.includes(video.id);
                  const durationMin = Math.floor((video.duration_seconds ?? 0) / 60);
                  return (
                    <button
                      key={video.id}
                      onClick={() => setPlayingVideoId(video.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 14px',
                        background: isPlaying ? '#F2FBF8' : 'white',
                        borderLeft: `3px solid ${isPlaying ? '#12C6A0' : 'transparent'}`,
                        border: 'none',
                        borderBottom: index < videos.length - 1 ? '0.5px solid #EAECEF' : 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: isDone ? '#12C6A0' : isPlaying ? '#12C6A0' : '#EAECEF',
                      }} />
                      <p style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: isPlaying ? 700 : 500, color: isPlaying ? '#085041' : '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {index + 1}. {video.title}
                      </p>
                      <span style={{ fontSize: 10, color: isDone ? '#12C6A0' : '#9CA3AF', fontWeight: isDone ? 700 : 400, flexShrink: 0 }}>
                        {isDone ? '✓ ' : isPlaying ? '▶ ' : ''}{durationMin}min
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Divider between video section and lesson ─────── */}
        {hasVideos && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 4px' }}>
            <div style={{ flex: 1, height: 0.5, background: '#EAECEF' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#667085', letterSpacing: '0.05em' }}>LEÇON</span>
            <div style={{ flex: 1, height: 0.5, background: '#EAECEF' }} />
          </div>
        )}

        {/* ── LESSON STEPPER — always rendered ─────────────── */}
        {topic && (
          <LessonStepper
            topicId={topic.id}
            topicName={topic.name}
            lessonContent={lessonContent}
            inlineBankId={inlineBank?.bankId ?? null}
            onSexercer={handleSexercer}
          />
        )}
      </div>
    </div>
  );
}
