
import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Message } from '@/types/chat';
import { Subject } from '@/types/admin';
import { DynamicIcon } from '@/components/admin/subjects/DynamicIcon';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
}: ChatPanelProps) => {
  return (
    <div className="w-full md:w-1/3 flex flex-col glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            StudyWhiz
            <Select defaultValue={activeSubject?.id || "general"}>
              <SelectTrigger className="w-[140px] h-7 text-xs bg-studywhiz-100 text-studywhiz-700 border-none">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">
                  <div className="flex items-center gap-2">
                    <DynamicIcon name="book" className="h-4 w-4" />
                    <span>General Tutor</span>
                  </div>
                </SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id} disabled={!subject.active}>
                    <div className="flex items-center gap-2">
                      <DynamicIcon name={subject.icon as any || "book"} className="h-4 w-4" />
                      <span>{subject.name}</span>
                      {subject.tutorActive && (
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            Tutor
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
