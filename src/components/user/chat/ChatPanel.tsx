import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Message } from '@/types/chat';
interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSendMessage: () => void;
  handleFileUpload: (file: File) => void;
  handlePhotoUpload: (file: File) => void;
  activeModel?: string;
}
const ChatPanel = ({
  messages = [],
  isLoading = false,
  inputMessage = '',
  setInputMessage,
  handleSendMessage,
  handleFileUpload,
  handlePhotoUpload,
  activeModel = 'AI Model'
}: ChatPanelProps) => {
  // Add a failsafe check for required props
  if (!setInputMessage || !handleSendMessage || !handleFileUpload || !handlePhotoUpload) {
    console.error('ChatPanel: Required props are missing');
    return <div className="w-full md:w-1/3 flex flex-col glass rounded-xl overflow-hidden p-4">
        <div className="text-red-500">Error: Unable to load chat. Please refresh the page.</div>
      </div>;
  }
  return <div className="w-full md:w-1/3 flex flex-col glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        
        <p className="text-sm text-gray-500 dark:text-gray-400">Ask questions or submit your homework for grading</p>
      </div>
      
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput inputMessage={inputMessage} setInputMessage={setInputMessage} handleSendMessage={handleSendMessage} handleFileUpload={handleFileUpload} handlePhotoUpload={handlePhotoUpload} isLoading={isLoading} />
    </div>;
};
export default ChatPanel;