
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Message, Exercise, Grade } from '@/types/chat';
import ChatPanel from './chat/ChatPanel';
import ExerciseList from './chat/ExerciseList';

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
  
  const [grade, setGrade] = useState<Grade>({
    percentage: 0,
    letter: 'N/A',
  });
  
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
  
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-6rem)] gap-4">
      {/* Chat Panel */}
      <ChatPanel 
        messages={messages}
        isLoading={isLoading}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        handleSendMessage={handleSendMessage}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        newExercise={newExercise}
        setNewExercise={setNewExercise}
        submitAsExercise={submitAsExercise}
      />
      
      {/* Exercise Panel */}
      <div className="w-full md:w-2/3 glass rounded-xl overflow-hidden">
        <ExerciseList
          exercises={exercises}
          grade={grade}
          toggleExerciseExpansion={toggleExerciseExpansion}
          submitExerciseAnswer={submitExerciseAnswer}
        />
      </div>
    </div>
  );
};

export default ChatInterface;
