/**
 * Connection testing utilities for AI service diagnostics
 */

import { supabase } from '@/integrations/supabase/client';

type ConnectionLike = {
  effectiveType?: string;
  type?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
};

type NetworkDiagnostics = {
  timestamp: string;
  userAgent: string;
  online: boolean;
  connection?: ConnectionLike;
  cookieEnabled: boolean;
  language: string;
  platform: string;
};

export interface ConnectionTestResult {
  success: boolean;
  method: 'supabase' | 'failed';
  error?: string;
  responseTime?: number;
  details?: unknown;
}

export const testAIServiceConnection = async (): Promise<ConnectionTestResult> => {
  const startTime = Date.now();

  const testPayload = {
    message: 'Test connection',
    modelId: 'deepseek-chat',
    history: [],
    isExercise: false
  };

  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: testPayload
    });

    if (error) {
      return {
        success: false,
        method: 'failed',
        error: error.message,
        responseTime: Date.now() - startTime,
      };
    }

    const responseTime = Date.now() - startTime;
    
    return {
      success: true,
      method: 'supabase',
      responseTime,
      details: data
    };
  } catch (error: unknown) {
    const typedError = error instanceof Error ? error : new Error(String(error));
    return {
      success: false,
      method: 'failed',
      error: typedError.message,
      responseTime: Date.now() - startTime,
      details: {
        name: typedError.name,
      }
    };
  }
};

export const getNetworkDiagnostics = async (): Promise<NetworkDiagnostics> => {
  const connection = (navigator as Navigator & {
    connection?: ConnectionLike;
    mozConnection?: ConnectionLike;
    webkitConnection?: ConnectionLike;
  }).connection
    || (navigator as Navigator & { mozConnection?: ConnectionLike }).mozConnection
    || (navigator as Navigator & { webkitConnection?: ConnectionLike }).webkitConnection;

  const results: NetworkDiagnostics = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    online: navigator.onLine,
    connection,
    cookieEnabled: navigator.cookieEnabled,
    language: navigator.language,
    platform: navigator.platform
  };

  return results;
};
