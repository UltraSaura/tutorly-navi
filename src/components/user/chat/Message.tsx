
import React from 'react';
import { File, Image, Calculator, Beaker, Book, Trophy, Flame, Award } from 'lucide-react';
import { Message as MessageType } from '@/types/chat';
import InlineExplanation from './InlineExplanation';
import { cn } from '@/lib/utils';

const Message = ({ 
  role, 
  content, 
  timestamp, 
  type = 'text', 
  filename, 
  fileUrl,
  subjectId,
  xpReward,
  streakDays,
  badgeName,
  explanation = [],
  isCorrect
}: MessageType) => {
  const getSubjectIcon = (subjectId?: string) => {
    switch (subjectId?.toLowerCase()) {
      case 'math':
      case 'mathematics':
        return <Calculator className="h-6 w-6 text-brand-primary" />;
      case 'science':
      case 'chemistry':
      case 'physics':
        return <Beaker className="h-6 w-6 text-brand-primary" />;
      case 'english':
      case 'literature':
        return <Book className="h-6 w-6 text-brand-primary" />;
      default:
        return <Book className="h-6 w-6 text-brand-primary" />;
    }
  };
  const renderContent = () => {
    // Gamification feedback messages
    if (type === 'xp_reward' && xpReward) {
      return (
        <div className="flex items-center gap-2 p-3 bg-game-xp/10 border border-game-xp/20 rounded-button">
          <Trophy className="h-5 w-5 text-game-xp" />
          <span className="font-medium text-game-xp">🎉 Well done! +{xpReward} XP</span>
        </div>
      );
    }
    
    if (type === 'feedback' && isCorrect === false) {
      return (
        <div className="flex items-center gap-2 p-3 bg-state-danger/10 border border-state-danger/20 rounded-button">
          <span className="font-medium text-state-danger">❌ Not yet — try again to earn more XP</span>
        </div>
      );
    }
    
    if (type === 'streak_milestone' && streakDays && badgeName) {
      return (
        <div className="flex items-center gap-2 p-3 bg-game-streak/10 border border-game-streak/20 rounded-button">
          <Flame className="h-5 w-5 text-game-streak" />
          <span className="font-medium text-game-streak">🔥 Day {streakDays} streak!</span>
          <Award className="h-4 w-4 text-game-coin" />
          <span className="font-medium text-game-coin">Badge unlocked 🏅 {badgeName}</span>
        </div>
      );
    }

    switch (type) {
      case 'file':
        return (
          <div className="flex items-center gap-2">
            <File className="h-5 w-5" />
            <span>{filename || 'Document'}</span>
            <a 
              href={fileUrl} 
              className="text-brand-primary hover:underline ml-2" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              View
            </a>
          </div>
        );
      case 'image':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              <span>{filename || 'Image'}</span>
            </div>
            {fileUrl && (
              <div className="mt-2">
                <img 
                  src={fileUrl} 
                  alt={content} 
                  className="max-w-full rounded-md max-h-60 object-contain" 
                />
              </div>
            )}
          </div>
        );
      default:
        return (
          <div>
            <p className="text-sm leading-relaxed">{content}</p>
            {explanation && explanation.length > 0 && (
              <InlineExplanation 
                steps={explanation} 
                onRetry={() => {/* Handle retry */}} 
              />
            )}
          </div>
        );
    }
  };

  // Gamification messages use special styling
  if (role === 'gamification') {
    return (
      <div className="flex justify-center my-2">
        <div className="max-w-sm">
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      {/* Subject icon for tutor messages */}
      {role === 'assistant' && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-neutral-surface border border-neutral-border flex items-center justify-center">
            {getSubjectIcon(subjectId)}
          </div>
        </div>
      )}
      
      <div className={cn(
        "max-w-[75%] rounded-xl px-4 py-3",
        role === 'user' 
          ? "bg-brand-primary text-white" 
          : "bg-neutral-surface text-neutral-text shadow-sm border border-neutral-border"
      )}>
        {renderContent()}
        <p className={cn(
          "text-xs mt-2 text-right opacity-70",
          role === 'user' ? "text-white/80" : "text-neutral-muted"
        )}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default Message;
