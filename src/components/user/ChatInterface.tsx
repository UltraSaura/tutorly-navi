
import { useState, useRef, useEffect } from 'react';
import { Send, Upload, Camera, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Exercise {
  id: string;
  question: string;
  userAnswer?: string;
  isCorrect?: boolean;
  explanation?: string;
  expanded: boolean;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi there! I'm your StudyWhiz AI tutor. How can I help you today? You can ask me questions, upload homework, or request practice exercises.",
      timestamp: new Date(Date.now() - 60000),
    },
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([
    {
      id: '1',
      question: 'What is the value of x in the equation 2x + 5 = 13?',
      userAnswer: 'x = 4',
      isCorrect: true,
      explanation: 'To solve for x, subtract 5 from both sides: 2x = 8. Then divide both sides by 2: x = 4.',
      expanded: false,
    },
    {
      id: '2',
      question: 'What is the capital of France?',
      userAnswer: 'Paris',
      isCorrect: true,
      explanation: 'Paris is the capital and most populous city of France.',
      expanded: false,
    },
    {
      id: '3',
      question: 'If a circle has a radius of 5 cm, what is its area?',
      userAnswer: '75 cm²',
      isCorrect: false,
      explanation: 'The formula for the area of a circle is πr². With r = 5, the area is π × 5² = π × 25 = 78.54 cm².',
      expanded: false,
    },
    {
      id: '4',
      question: 'Who wrote "Romeo and Juliet"?',
      userAnswer: 'William Shakespeare',
      isCorrect: true,
      explanation: 'William Shakespeare wrote "Romeo and Juliet" around 1595.',
      expanded: false,
    },
    {
      id: '5',
      question: 'What is the chemical symbol for gold?',
      userAnswer: 'Go',
      isCorrect: false,
      explanation: 'The chemical symbol for gold is Au, from the Latin word "aurum".',
      expanded: false,
    },
  ]);
  
  const [grade, setGrade] = useState({
    percentage: 67,
    letter: 'B',
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = () => {
    if (inputMessage.trim() === '') return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages([...messages, newMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I understand you're asking about " + inputMessage.substring(0, 20) + "... Let me help with that!",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const toggleExerciseExpansion = (id: string) => {
    setExercises(exercises.map(exercise => 
      exercise.id === id ? { ...exercise, expanded: !exercise.expanded } : exercise
    ));
  };
  
  const correctExercises = exercises.filter(ex => ex.isCorrect).length;
  const totalExercises = exercises.length;
  
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-6rem)] gap-4">
      {/* Chat Panel */}
      <div className="w-full md:w-1/3 flex flex-col glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">AI Tutor Chat</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ask questions or upload your assignments</p>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl ${
                    message.role === 'user' 
                      ? 'bg-studywhiz-600 text-white rounded-tr-none' 
                      : 'bg-gray-100 dark:bg-gray-800 rounded-tl-none'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1 text-right">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
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
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="shrink-0">
              <Upload className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" className="shrink-0">
              <Camera className="h-5 w-5" />
            </Button>
            <Textarea 
              placeholder="Type your message..." 
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-10 resize-none"
            />
            <Button 
              size="icon" 
              className="shrink-0 bg-studywhiz-600 hover:bg-studywhiz-700"
              disabled={inputMessage.trim() === '' || isLoading}
              onClick={handleSendMessage}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Exercise Panel */}
      <div className="w-full md:w-2/3 glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Current Exercise</h2>
          <div className="flex justify-between items-center mt-2">
            <div className="flex-1 mr-4">
              <Progress value={grade.percentage} className="h-2 bg-gray-200" />
            </div>
            <span className="text-lg font-semibold">{grade.percentage}% {grade.letter}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Progress</span>
            <span>{correctExercises} of {totalExercises} correct</span>
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100%-8rem)] p-4">
          <div className="space-y-4">
            {exercises.map((exercise) => (
              <div 
                key={exercise.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-200"
              >
                <div className="p-4">
                  <div className="flex justify-between">
                    <h3 className="text-md font-medium">{exercise.question}</h3>
                    {exercise.isCorrect !== undefined && (
                      <div className={`flex items-center gap-1 ${
                        exercise.isCorrect 
                          ? 'text-exercise-correct' 
                          : 'text-exercise-incorrect'
                      }`}>
                        {exercise.isCorrect ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <X className="w-5 h-5" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {exercise.userAnswer && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Your answer: </span>
                      <span className={exercise.isCorrect ? 'text-exercise-correct' : 'text-exercise-incorrect'}>
                        {exercise.userAnswer}
                      </span>
                    </div>
                  )}
                  
                  <div className="mt-4 flex justify-between items-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => toggleExerciseExpansion(exercise.id)}
                    >
                      {exercise.expanded ? 'Hide explanation' : 'Show explanation'}
                      {exercise.expanded ? (
                        <ChevronUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                    
                    {!exercise.isCorrect && (
                      <Button variant="outline" size="sm" className="text-xs">
                        Try Again
                      </Button>
                    )}
                  </div>
                </div>
                
                <AnimatePresence>
                  {exercise.expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Separator />
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
                        <h4 className="text-sm font-medium mb-2">Explanation</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {exercise.explanation}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ChatInterface;
