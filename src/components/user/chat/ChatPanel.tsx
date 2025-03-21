
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ExerciseSubmissionForm from './ExerciseSubmissionForm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'file' | 'image';
  filename?: string;
  fileUrl?: string;
}

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSendMessage: () => void;
  handleFileUpload: (file: File) => void;
  handlePhotoUpload: (file: File) => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  newExercise: string;
  setNewExercise: (exercise: string) => void;
  submitAsExercise: () => void;
  activeModel?: string;
}

const ChatPanel = ({
  messages,
  isLoading,
  inputMessage,
  setInputMessage,
  handleSendMessage,
  handleFileUpload,
  handlePhotoUpload,
  currentTab,
  setCurrentTab,
  newExercise,
  setNewExercise,
  submitAsExercise,
  activeModel = 'AI Model',
}: ChatPanelProps) => {
  return (
    <div className="w-full md:w-1/3 flex flex-col glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">AI Tutor Chat</h2>
          <div className="flex items-center px-2 py-1 rounded-full bg-studywhiz-100 text-studywhiz-700 text-xs font-medium">
            {activeModel}
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Ask questions or submit your assignments</p>
      </div>
      
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="submit">Submit Exercise</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {currentTab === 'chat' ? (
        <>
          <MessageList messages={messages} isLoading={isLoading} />
          <MessageInput 
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            handleSendMessage={handleSendMessage}
            handleFileUpload={handleFileUpload}
            handlePhotoUpload={handlePhotoUpload}
            isLoading={isLoading}
          />
        </>
      ) : (
        <ExerciseSubmissionForm
          newExercise={newExercise}
          setNewExercise={setNewExercise}
          submitAsExercise={submitAsExercise}
        />
      )}
    </div>
  );
};

export default ChatPanel;
