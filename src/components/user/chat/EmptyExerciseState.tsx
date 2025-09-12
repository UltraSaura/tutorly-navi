import React from 'react';
import { Plus, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface EmptyExerciseStateProps {
  onAddExercise?: () => void;
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
}

const EmptyExerciseState = ({ 
  onAddExercise, 
  inputMessage, 
  onInputChange, 
  onSubmit, 
  isLoading 
}: EmptyExerciseStateProps) => {
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-8 relative">
      {/* Main Content Container */}
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        {/* Character Illustration Container */}
        <div className="relative mb-6">
          {/* Main Character Circle */}
          <div className="w-48 h-48 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center relative overflow-hidden">
            {/* Character */}
            <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              🎓
            </div>
            
            {/* Floating Elements */}
            <div className="absolute top-4 left-4 w-8 h-8 bg-orange-200 rounded-lg flex items-center justify-center text-orange-600 text-sm font-bold">
              🧪
            </div>
            
            <div className="absolute top-6 right-6 w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-green-600 text-xs font-bold">
              abc
            </div>
            
            <div className="absolute bottom-8 left-6 w-10 h-6 bg-blue-200 rounded-md flex items-center justify-center text-blue-600 text-xs font-mono">
              x²+y²
            </div>
            
            <div className="absolute bottom-4 right-4 w-8 h-8 bg-yellow-200 rounded-lg flex items-center justify-center text-yellow-600">
              📚
            </div>
          </div>
        </div>

        {/* Main Message */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Let's Start Learning!
          </h2>
          <p className="text-gray-600 text-base leading-relaxed">
            Upload your homework or type a question to get personalized explanations and practice exercises.
          </p>
        </div>

        {/* First Explorer Badge Promotion */}
        <div className="mb-8">
          <Badge variant="outline" className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Become a First Explorer - Start Now!
          </Badge>
        </div>
      </div>

      {/* Input Area */}
      <div className="w-full max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex gap-2">
            {/* Add Button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onAddExercise}
              className="shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 transition-colors"
              disabled={isLoading}
            >
              <Plus className="w-5 h-5 text-gray-500 hover:text-purple-600" />
            </Button>

            {/* Input Field */}
            <div className="flex-1 relative">
              <Input
                value={inputMessage}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder="Type your question or upload homework..."
                className="h-12 pr-14 rounded-xl border-2 focus:border-purple-400"
                disabled={isLoading}
              />
              
              {/* Send Button */}
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-purple-600 hover:bg-purple-700"
                disabled={isLoading || !inputMessage.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top Left */}
        <div className="absolute top-20 left-8 w-3 h-3 bg-purple-200 rounded-full opacity-60"></div>
        <div className="absolute top-32 left-16 w-2 h-2 bg-blue-200 rounded-full opacity-40"></div>
        
        {/* Top Right */}
        <div className="absolute top-24 right-12 w-4 h-4 bg-orange-200 rounded-full opacity-50"></div>
        <div className="absolute top-40 right-6 w-2 h-2 bg-green-200 rounded-full opacity-60"></div>
        
        {/* Bottom */}
        <div className="absolute bottom-32 left-12 w-3 h-3 bg-yellow-200 rounded-full opacity-40"></div>
        <div className="absolute bottom-24 right-16 w-3 h-3 bg-pink-200 rounded-full opacity-50"></div>
      </div>
    </div>
  );
};

export default EmptyExerciseState;