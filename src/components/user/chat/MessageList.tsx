
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
    <ScrollArea className="flex-1 bg-neutral-bg overflow-x-hidden">
      <div className="py-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-center px-6">
            <div>
              <h3 className="text-lg font-semibold text-neutral-text mb-2">Start a conversation</h3>
              <p className="text-neutral-muted">Upload homework, ask questions, or type math problems to get started!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <Message 
                key={message.id}
                {...message}
              />
            ))}
            
            {isLoading && (
              <div className="flex justify-start px-4 py-2">
                <div className="flex-shrink-0 w-8 h-8 bg-brand-tint rounded-full flex items-center justify-center mr-3 mt-1">
                  <div className="h-4 w-4 bg-brand-primary/20 rounded-full" />
                </div>
                <div className="max-w-[85%] p-4 bg-neutral-surface rounded-xl rounded-tl-none shadow-sm border border-neutral-border">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-neutral-muted/40 animate-pulse delay-100"></div>
                    <div className="w-2 h-2 rounded-full bg-neutral-muted/40 animate-pulse delay-200"></div>
                    <div className="w-2 h-2 rounded-full bg-neutral-muted/40 animate-pulse delay-300"></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

export default MessageList;
