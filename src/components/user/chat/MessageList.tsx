
import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Message from './Message';
import { Message as MessageType } from '@/types/chat';
import { useLanguage } from '@/context/SimpleLanguageContext';

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
}

const MessageList = ({ messages, isLoading }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ScrollArea className="flex-1 p-4 bg-neutral-bg">
      <div className="space-y-2 max-w-4xl mx-auto">
        {messages.map((message) => (
          <Message 
            key={message.id}
            {...message}
          />
        ))}
        
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-neutral-surface border border-neutral-border flex items-center justify-center mt-1">
                <div className="w-4 h-4 bg-brand-primary rounded-full animate-pulse" />
              </div>
              <div className="max-w-[75%] rounded-xl px-4 py-3 bg-neutral-surface border border-neutral-border">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-neutral-muted animate-pulse delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-neutral-muted animate-pulse delay-200"></div>
                  <div className="w-2 h-2 rounded-full bg-neutral-muted animate-pulse delay-300"></div>
                </div>
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
