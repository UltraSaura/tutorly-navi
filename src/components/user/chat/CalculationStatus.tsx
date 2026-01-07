import React from 'react';
import { Loader2, Calculator, Brain, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/SimpleLanguageContext';
import type { CalculationState } from '@/hooks/useChat';

interface CalculationStatusProps {
  isProcessing: CalculationState['isProcessing'];
  status: CalculationState['currentStep'];
  message?: CalculationState['message'];
}

const CalculationStatus: React.FC<CalculationStatusProps> = ({ 
  isProcessing, 
  status, 
  message 
}) => {
  const { t } = useLanguage();

  // Add debug logging
  console.log('[CalculationStatus] Rendering with:', { isProcessing, status, message });

  if (!isProcessing) {
    console.log('[CalculationStatus] Not processing, returning null');
    return null;
  }

  const getStatusInfo = () => {
    switch (status) {
      case 'detecting':
        return {
          icon: <Brain className="h-4 w-4" />,
          text: t('calculation.detecting') || 'Detecting math content...',
          color: 'text-blue-600'
        };
      case 'analyzing':
        return {
          icon: <Calculator className="h-4 w-4" />,
          text: t('calculation.analyzing') || 'Analyzing problem...',
          color: 'text-purple-600'
        };
      case 'solving':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: t('calculation.solving') || 'Solving calculation...',
          color: 'text-green-600'
        };
      case 'grading':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: t('calculation.grading') || 'Grading your answer...',
          color: 'text-orange-600'
        };
      case 'complete':
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          text: t('calculation.complete') || 'Complete!',
          color: 'text-green-600'
        };
      default:
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: t('calculation.processing') || 'Processing...',
          color: 'text-gray-600'
        };
    }
  };

  const statusInfo = getStatusInfo();

  console.log('[CalculationStatus] Rendering status component with:', statusInfo);

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg mx-4 my-2 animate-pulse">
      <div className={`${statusInfo.color}`}>
        {statusInfo.icon}
      </div>
      <span className="text-sm font-medium text-blue-800">
        {statusInfo.text}
      </span>
      {message && (
        <span className="text-xs text-blue-600 ml-auto">
          {message}
        </span>
      )}
    </div>
  );
};

export default CalculationStatus;
