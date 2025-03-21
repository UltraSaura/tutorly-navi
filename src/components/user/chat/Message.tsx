
import React from 'react';
import { File, Image } from 'lucide-react';

interface MessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'file' | 'image';
  filename?: string;
  fileUrl?: string;
}

const Message = ({ role, content, timestamp, type = 'text', filename, fileUrl }: MessageProps) => {
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
        return <p className="text-sm">{content}</p>;
    }
  };

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[85%] p-3 rounded-2xl ${
          role === 'user' 
            ? 'bg-studywhiz-600 text-white rounded-tr-none' 
            : 'bg-gray-100 dark:bg-gray-800 rounded-tl-none'
        }`}
      >
        {renderContent()}
        <p className="text-xs opacity-70 mt-1 text-right">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default Message;
