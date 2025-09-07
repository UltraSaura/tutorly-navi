import React, { useState } from 'react';
import { Plus, Send, Flame, Star, GraduationCap, Lightbulb, FlaskConical, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/hooks/useChat';
import { useExercises } from '@/hooks/useExercises';
import { useUserContext } from '@/hooks/useUserContext';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const MobileExerciseLanding = () => {
  const { t } = useTranslation();
  const [inputMessage, setInputMessage] = useState('');
  
  const {
    handleSendMessage,
    isLoading
  } = useChat();
  
  const {
    exercises,
    grade
  } = useExercises();
  
  const { userContext } = useUserContext();
  
  // Mock data for gamification (replace with real data from context)
  const userStats = {
    currentLevel: 2,
    currentXp: 245,
    streakDays: 7,
    streakActive: true,
    coins: 245
  };

  const handleSubmit = async () => {
    if (inputMessage.trim()) {
      // Handle message submission
      await handleSendMessage();
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Section - Progress Indicators */}
      <div className="px-6 pt-6 pb-4">
        {/* Top row with folder icon and badges */}
        <div className="flex items-center justify-between mb-4">
          {/* Left side - Folder icon */}
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-gray-600" />
          </div>
          
          {/* Right side - XP badge */}
          <div className="bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5 flex items-center space-x-2">
            <Star className="h-4 w-4 text-orange-600" />
            <span className="text-orange-700 text-sm font-medium">245 XP</span>
          </div>
        </div>

        {/* Level and Streak Badge */}
        <div className="mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2.5 rounded-full inline-flex items-center space-x-3">
            <span className="text-sm font-semibold">L-2</span>
            <div className="w-px h-4 bg-white/30"></div>
            <div className="flex items-center space-x-1.5">
              <Flame className="h-4 w-4 text-orange-300" />
              <span className="text-sm font-medium">7 day streak</span>
            </div>
          </div>
        </div>

        {/* Overall Grade */}
        <div className="flex items-center space-x-2">
          <GraduationCap className="h-5 w-5 text-gray-600" />
          <span className="text-gray-600 text-sm">Overall grade:</span>
          <span className="text-red-600 font-semibold text-sm">0% (--)</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Character Illustration */}
        <div className="relative mb-8">
          {/* Main Character Circle */}
          <div className="w-32 h-32 bg-orange-400 rounded-full flex items-center justify-center relative">
            <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-4xl">👨‍💻</span>
            </div>
          </div>
          
          {/* Books Stack - Left side */}
          <div className="absolute -left-8 top-8 space-y-1">
            <div className="w-6 h-8 bg-red-500 rounded-sm"></div>
            <div className="w-6 h-8 bg-blue-500 rounded-sm"></div>
            <div className="w-6 h-8 bg-green-500 rounded-sm"></div>
          </div>
          
          {/* A+ Grade - Below books */}
          <div className="absolute -left-12 -bottom-2 text-gray-600 text-lg font-bold">
            A+
          </div>
          
          {/* Math Equation - Top right */}
          <div className="absolute -right-8 top-4 text-gray-400 text-sm transform rotate-12">
            x² + y² = z²
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center space-x-2">
            <span>Let's Start Learning !</span>
            <Lightbulb className="h-6 w-6 text-yellow-500" />
          </h1>
          
          {/* Beaker Icon */}
          <div className="mt-4">
            <FlaskConical className="h-8 w-8 text-gray-400 mx-auto" />
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="px-4 pb-6">
        <div className="flex items-center space-x-3 bg-gray-50 rounded-full p-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-gray-200"
          >
            <Plus className="h-5 w-5 text-gray-500" />
          </Button>
          
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your exercise or question..."
            className="flex-1 border-none bg-transparent focus:ring-0 focus:border-none text-sm placeholder:text-gray-500"
            disabled={isLoading}
          />
          
          <Button
            onClick={handleSubmit}
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
            className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileExerciseLanding; 