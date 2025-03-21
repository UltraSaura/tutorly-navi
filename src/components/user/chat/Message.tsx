
import React from 'react';

interface MessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const Message = ({ role, content, timestamp }: MessageProps) => {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[85%] p-3 rounded-2xl ${
          role === 'user' 
            ? 'bg-studywhiz-600 text-white rounded-tr-none' 
            : 'bg-gray-100 dark:bg-gray-800 rounded-tl-none'
        }`}
      >
        <p className="text-sm">{content}</p>
        <p className="text-xs opacity-70 mt-1 text-right">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default Message;
