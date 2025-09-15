
import React, { useState } from 'react';
import { File, Image, Calculator, FlaskConical, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { Message as MessageType } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { processMathContentForDisplay } from '@/utils/mathDisplayProcessor';

const Message = ({ 
  role, 
  content, 
  timestamp, 
  type = 'text', 
  filename, 
  fileUrl,
  subjectId,
  explanation 
}: MessageType) => {
  const [showExplanation, setShowExplanation] = useState(false);

  const getSubjectIcon = (subjectId?: string) => {
    if (!subjectId) return BookOpen;
    
    if (subjectId.toLowerCase().includes('math')) return Calculator;
    if (subjectId.toLowerCase().includes('science') || subjectId.toLowerCase().includes('physics') || subjectId.toLowerCase().includes('chemistry')) return FlaskConical;
    return BookOpen;
  };

  const SubjectIcon = getSubjectIcon(subjectId);
  const renderContent = () => {
    switch (type) {
      case 'file':
        return (
          <div className="flex items-center gap-2">
            <File className="h-5 w-5" />
            <span>{filename || 'Document'}</span>
            <a 
              href={fileUrl} 
              className="text-blue-500 hover:underline ml-2" 
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
        // Process content for mathematical expressions
        const processedContent = processMathContentForDisplay(content);
        
        return (
          <div>
            {processedContent.isMath ? (
              <div className="text-sm">
                <MathRenderer 
                  latex={processedContent.processed} 
                  inline={false}
                  className="math-content"
                />
              </div>
            ) : (
              <p className="text-sm">{content}</p>
            )}
            {explanation && role === 'assistant' && (
              <div className="mt-3 pt-3 border-t border-neutral-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="flex items-center gap-2 text-xs text-neutral-muted hover:text-neutral-text"
                >
                  {showExplanation ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Step-by-step explanation
                </Button>
                {showExplanation && (
                  <div className="mt-2 space-y-2">
                    {explanation.split('\n').map((step, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-[10px] font-medium mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-neutral-muted">{step}</span>
                      </div>
                    ))}
                    <Button 
                      size="sm" 
                      className="mt-3 text-xs bg-brand-primary hover:bg-brand-navy"
                    >
                      Try again → +5 XP
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} px-4 py-2`}>
      {/* Subject Icon for Tutor Messages */}
      {role === 'assistant' && (
        <div className="flex-shrink-0 w-8 h-8 bg-brand-tint rounded-full flex items-center justify-center mr-3 mt-1">
          <SubjectIcon className="h-4 w-4 text-brand-primary" />
        </div>
      )}
      
      <div 
        className={`max-w-[85%] p-4 ${
          role === 'user' 
            ? 'bg-brand-primary text-white rounded-xl rounded-tr-none' 
            : 'bg-neutral-surface text-neutral-text rounded-xl rounded-tl-none shadow-sm border border-neutral-border'
        }`}
      >
        {renderContent()}
        <p className={`${'text-xs mt-2 text-right opacity-70'} ${
          role === 'user' ? 'text-white/80' : 'text-neutral-muted'
        }`}>
          {(() => {
            try {
              const time = timestamp instanceof Date ? timestamp : new Date(timestamp as unknown as string);
              return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch {
              return '';
            }
          })()}
        </p>
      </div>
    </div>
  );
};

export default Message;
