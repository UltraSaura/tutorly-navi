
import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Message from './Message';
import { Message as MessageType } from '@/types/chat';

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
}

const MessageList = ({ messages, isLoading }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <Message 
            key={message.id}
            {...message}
          />
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-none">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-200"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-300"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

export default MessageList;
