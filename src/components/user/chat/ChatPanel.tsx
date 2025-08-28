import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Message } from '@/types/chat';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { Badge } from '@/components/ui/badge';

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
  const { t } = useLanguage();
  // Add a failsafe check for required props
  if (!setInputMessage || !handleSendMessage || !handleFileUpload || !handlePhotoUpload) {
    console.error('ChatPanel: Required props are missing');
    return <div className="w-full md:w-1/3 flex flex-col glass rounded-xl overflow-hidden p-4">
        <div className="text-red-500">{t('chat.error')}</div>
      </div>;
  }
  return <div className="w-full md:w-1/3 flex flex-col glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('chat.askQuestions')}</p>
          <Badge variant="secondary" className="text-xs">
            {activeModel}
          </Badge>
        </div>
      </div>
      
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput inputMessage={inputMessage} setInputMessage={setInputMessage} handleSendMessage={handleSendMessage} handleFileUpload={handleFileUpload} handlePhotoUpload={handlePhotoUpload} isLoading={isLoading} />
    </div>;
};
export default ChatPanel;