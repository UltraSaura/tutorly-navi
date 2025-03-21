
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { toast } from 'sonner';
import { Message, Exercise, Grade } from '@/types/chat';
import { useAdmin } from '@/context/AdminContext';
import { supabase } from "@/integrations/supabase/client";
import ChatPanel from './chat/ChatPanel';
import ExerciseList from './chat/ExerciseList';

const ChatInterface = () => {
  const { selectedModelId, getAvailableModels } = useAdmin();
  
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
  const { toast: uiToast } = useToast();
  
  const [grade, setGrade] = useState<Grade>({
    percentage: 0,
    letter: 'N/A',
  });
  
  // Get model info to display
  const activeModel = (() => {
    const models = getAvailableModels();
    const model = models.find(m => m.id === selectedModelId);
    return model ? model.name : 'AI Model';
  })();
  
  // Convert messages to history format for the API
  const getMessageHistory = () => {
    return messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
  };
  
  const handleSendMessage = async () => {
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
    
    try {
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: inputMessage,
          modelId: selectedModelId,
          history: getMessageHistory(),
        },
      });
      
      if (error) {
        console.error('Error calling AI chat function:', error);
        throw new Error(error.message || 'Failed to get AI response');
      }
      
      // Add AI response to messages
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      // Show model used as a toast
      toast.success(`Response generated using ${data.provider} ${data.modelUsed}`);
      
    } catch (error) {
      console.error('Error in AI chat:', error);
      
      // Check if the error is related to missing API keys
      if (error.message?.includes('API key not configured')) {
        toast.error(`API key missing for the selected model. Please add the required API key in Supabase settings.`);
      } else {
        toast.error('Failed to get AI response. Using fallback response.');
      }
      
      // Fallback response if the API call fails
      const fallbackResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're asking about ${inputMessage.substring(0, 20)}... Let me help with that! If you'd like to submit this as an exercise or homework to work on, click the "Submit as Exercise" button below.`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileUpload = (file: File) => {
    // Create a temporary URL for the file
    const fileUrl = URL.createObjectURL(file);
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Uploaded a document: ${file.name}`,
      timestamp: new Date(),
      type: 'file',
      filename: file.name,
      fileUrl: fileUrl,
    };
    
    setMessages([...messages, newMessage]);
    setIsLoading(true);
    
    // Call AI model with the document info
    setTimeout(async () => {
      try {
        // Here we would process the document with the AI
        // For now using a simulated response
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I've received your document "${file.name}". Would you like me to help you understand its content or would you like to submit this as an exercise to work on?`,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiResponse]);
      } catch (error) {
        console.error('Error processing document:', error);
        toast.error('Failed to process document');
      } finally {
        setIsLoading(false);
      }
    }, 2000);
  };
  
  const handlePhotoUpload = (file: File) => {
    // Create a temporary URL for the image
    const imageUrl = URL.createObjectURL(file);
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Uploaded an image: ${file.name}`,
      timestamp: new Date(),
      type: 'image',
      filename: file.name,
      fileUrl: imageUrl,
    };
    
    setMessages([...messages, newMessage]);
    setIsLoading(true);
    
    // Call AI model with the image info
    setTimeout(async () => {
      try {
        // Here we would process the image with the AI
        // For now using a simulated response
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I've received your image and processed it using OCR. I can see some text that appears to be related to ${Math.random() > 0.5 ? 'mathematics' : 'science'}. Would you like me to help explain this content or would you like to submit it as an exercise?`,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiResponse]);
      } catch (error) {
        console.error('Error processing image:', error);
        toast.error('Failed to process image');
      } finally {
        setIsLoading(false);
      }
    }, 2500);
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
        handleFileUpload={handleFileUpload}
        handlePhotoUpload={handlePhotoUpload}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        newExercise={newExercise}
        setNewExercise={setNewExercise}
        submitAsExercise={submitAsExercise}
        activeModel={activeModel}
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
