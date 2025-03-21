
import { useState, useRef, useEffect } from 'react';
import { Send, Upload, Camera, ChevronDown, ChevronUp, Check, X, BookOpen, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

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
      content: "👋 Hi there! I'm your StudyWhiz AI tutor. How can I help you today? You can ask me questions, upload homework, or submit exercises for me to help you with.",
      timestamp: new Date(Date.now() - 60000),
    },
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentTab, setCurrentTab] = useState('chat');
  const [newExercise, setNewExercise] = useState('');
  const { toast } = useToast();
  
  const [grade, setGrade] = useState({
    percentage: 0,
    letter: 'N/A',
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
        content: `I understand you're asking about ${inputMessage.substring(0, 20)}... Let me help with that! If you'd like to submit this as an exercise or homework to work on, click the "Submit as Exercise" button below.`,
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
  
  const handleFileUpload = () => {
    toast({
      title: "Upload Homework or Exercise",
      description: "You can upload PDFs, Word documents, or images of your homework to get help.",
    });
    // File upload functionality would be implemented here
  };
  
  const handlePhotoUpload = () => {
    toast({
      title: "Take a Photo of Your Work",
      description: "Take a picture of your homework or written exercise to get immediate feedback.",
    });
    // Photo upload functionality would be implemented here
  };
  
  const toggleExerciseExpansion = (id: string) => {
    setExercises(exercises.map(exercise => 
      exercise.id === id ? { ...exercise, expanded: !exercise.expanded } : exercise
    ));
  };
  
  const submitAsExercise = () => {
    if (newExercise.trim() === '') {
      toast({
        title: "Cannot Submit Empty Exercise",
        description: "Please enter your exercise or homework question.",
        variant: "destructive",
      });
      return;
    }
    
    const newEx: Exercise = {
      id: Date.now().toString(),
      question: newExercise,
      expanded: false,
    };
    
    setExercises([...exercises, newEx]);
    setNewExercise('');
    
    toast({
      title: "Exercise Submitted",
      description: "Your exercise has been submitted. I'll help you work through it!",
    });
    
    // Add a message to the chat about the exercise submission
    const confirmMessage: Message = {
      id: (Date.now() + 2).toString(),
      role: 'assistant',
      content: `I've added your exercise to the list. Let's work on it together! You can see it in the exercise panel.`,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, confirmMessage]);
    
    // Update grade calculation
    updateGrades();
  };
  
  const submitExerciseAnswer = (id: string, answer: string) => {
    // Simulate answer evaluation
    const isCorrect = Math.random() > 0.3; // 70% chance of being correct for demo
    
    setExercises(exercises.map(exercise => 
      exercise.id === id 
        ? { 
            ...exercise, 
            userAnswer: answer, 
            isCorrect, 
            explanation: isCorrect 
              ? "Great job! Your answer is correct." 
              : "Let's review this together. Here's how to approach this problem..."
          } 
        : exercise
    ));
    
    updateGrades();
  };
  
  const updateGrades = () => {
    const answeredExercises = exercises.filter(ex => ex.isCorrect !== undefined);
    if (answeredExercises.length === 0) {
      setGrade({ percentage: 0, letter: 'N/A' });
      return;
    }
    
    const correctExercises = answeredExercises.filter(ex => ex.isCorrect).length;
    const percentage = Math.round((correctExercises / answeredExercises.length) * 100);
    
    let letter = 'F';
    if (percentage >= 90) letter = 'A';
    else if (percentage >= 80) letter = 'B';
    else if (percentage >= 70) letter = 'C';
    else if (percentage >= 60) letter = 'D';
    
    setGrade({ percentage, letter });
  };
  
  const correctExercises = exercises.filter(ex => ex.isCorrect).length;
  const answeredExercises = exercises.filter(ex => ex.isCorrect !== undefined).length;
  const totalExercises = exercises.length;
  
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-6rem)] gap-4">
      {/* Chat Panel */}
      <div className="w-full md:w-1/3 flex flex-col glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">AI Tutor Chat</h2>
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
                <Button variant="outline" size="icon" className="shrink-0" onClick={handleFileUpload}>
                  <Upload className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon" className="shrink-0" onClick={handlePhotoUpload}>
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
          </>
        ) : (
          <div className="flex-1 p-4 flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Submit New Exercise or Homework
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Type or paste your exercise or homework question below. I'll help you work through it step by step.
              </p>
              <Textarea
                placeholder="Enter your exercise or homework question here..."
                value={newExercise}
                onChange={(e) => setNewExercise(e.target.value)}
                className="min-h-[150px] mb-4"
              />
              <Button 
                className="w-full bg-studywhiz-600 hover:bg-studywhiz-700"
                onClick={submitAsExercise}
              >
                <PenLine className="h-5 w-5 mr-2" />
                Submit Exercise
              </Button>
            </div>
            <Separator className="my-4" />
            <div>
              <h3 className="text-md font-medium mb-2">Tips for submitting work:</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-disc pl-5">
                <li>Be specific with your question</li>
                <li>Include any relevant context or background information</li>
                <li>If you're stuck, explain what you've tried so far</li>
                <li>You can also upload photos or files of your work using the buttons in the chat tab</li>
              </ul>
            </div>
          </div>
        )}
      </div>
      
      {/* Exercise Panel */}
      <div className="w-full md:w-2/3 glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Current Exercises & Homework</h2>
          <div className="flex justify-between items-center mt-2">
            <div className="flex-1 mr-4">
              <Progress value={grade.percentage} className="h-2 bg-gray-200" />
            </div>
            <span className="text-lg font-semibold">
              {answeredExercises > 0 ? `${grade.percentage}% ${grade.letter}` : 'No graded work yet'}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Progress</span>
            <span>{correctExercises} of {answeredExercises} correct • {totalExercises} total</span>
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100%-8rem)] p-4">
          {exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No exercises submitted yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                Use the "Submit Exercise" tab to add your homework questions or exercises, or ask me a question in the chat and I'll help you convert it to an exercise.
              </p>
            </div>
          ) : (
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
                            ? 'text-green-600 dark:text-green-500' 
                            : 'text-red-600 dark:text-red-500'
                        }`}>
                          {exercise.isCorrect ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <X className="w-5 h-5" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {exercise.userAnswer ? (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">Your answer: </span>
                        <span className={exercise.isCorrect ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}>
                          {exercise.userAnswer}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <Textarea 
                          placeholder="Enter your answer here..." 
                          className="text-sm resize-none" 
                          onBlur={(e) => {
                            if (e.target.value.trim()) {
                              submitExerciseAnswer(exercise.id, e.target.value);
                            }
                          }}
                        />
                        <div className="flex justify-end mt-2">
                          <Button size="sm" variant="outline">Submit Answer</Button>
                        </div>
                      </div>
                    )}
                    
                    {exercise.userAnswer && (
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
                    )}
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
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default ChatInterface;
