
import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Message } from '@/types/chat';
import { Subject } from '@/types/admin';
import { useAdmin } from '@/context/AdminContext';

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSendMessage: () => void;
  handleFileUpload: (file: File) => void;
  handlePhotoUpload: (file: File) => void;
  activeModel?: string;
  activeSubject?: Subject | null;
  onSelectSubject?: (subjectId: string) => void;
}

const ChatPanel = ({
  messages,
  isLoading,
  inputMessage,
  setInputMessage,
  handleSendMessage,
  handleFileUpload,
  handlePhotoUpload,
  activeModel = 'AI Model',
  activeSubject = null,
  onSelectSubject,
}: ChatPanelProps) => {
  return (
    <div className="w-full md:w-1/3 flex flex-col glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {activeSubject ? activeSubject.name : 'General'} Tutor
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {activeSubject 
            ? `Ask questions or submit homework about ${activeSubject.name}`
            : "Ask questions or submit your homework for grading"}
        </p>
      </div>
      
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput 
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        handleSendMessage={handleSendMessage}
        handleFileUpload={handleFileUpload}
        handlePhotoUpload={handlePhotoUpload}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ChatPanel;
