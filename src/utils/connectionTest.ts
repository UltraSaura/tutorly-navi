/**
 * Connection testing utilities for AI service diagnostics
 */

import { supabase } from '@/integrations/supabase/client';

export interface ConnectionTestResult {
  success: boolean;
  method: 'supabase' | 'direct' | 'failed';
  error?: string;
  responseTime?: number;
  details?: any;
}

export const testAIServiceConnection = async (): Promise<ConnectionTestResult> => {
  const startTime = Date.now();
  
  console.log('🔍 Starting AI service connection test...');
  
  // Test payload
  const testPayload = {
    message: 'Test connection',
    modelId: 'deepseek-chat',
    history: [],
    isExercise: false
  };

  // Try Supabase client first
  try {
    console.log('🔄 Testing Supabase client...');
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: testPayload
    });

    if (error) {
      console.log('❌ Supabase client failed, trying direct...');
      return await testDirectConnection(testPayload, startTime);
    }

    const responseTime = Date.now() - startTime;
    console.log('✅ Supabase client success');
    
    return {
      success: true,
      method: 'supabase',
      responseTime,
      details: data
    };
  } catch (error: any) {
    console.log('❌ Supabase client error, trying direct...');
    return await testDirectConnection(testPayload, startTime);
  }
};

const testDirectConnection = async (payload: any, startTime: number): Promise<ConnectionTestResult> => {
  try {
    console.log('🌐 Testing direct HTTP connection...');
    
    const response = await fetch('https://sibprjxhbxahouejygeu.supabase.co/functions/v1/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYnByanhoYnhhaG91ZWp5Z2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1Njk3NzcsImV4cCI6MjA1ODE0NTc3N30.EeWA7wiqiSsZF_WXO_GDELanejenEeqg6MRZpToNnWM`
      },
      body: JSON.stringify(payload)
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Direct HTTP failed:', response.status, errorText);
      
      return {
        success: false,
        method: 'failed',
        error: `HTTP ${response.status}: ${errorText}`,
        responseTime,
        details: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      };
    }

    const data = await response.json();
    console.log('✅ Direct HTTP success');
    
    return {
      success: true,
      method: 'direct',
      responseTime,
      details: data
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.log('❌ Direct HTTP error:', error);
    
    return {
      success: false,
      method: 'failed',
      error: error.message,
      responseTime,
      details: {
        name: error.name,
        stack: error.stack
      }
    };
  }
};

export const getNetworkDiagnostics = async (): Promise<any> => {
  const results = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    online: navigator.onLine,
    connection: (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection,
    cookieEnabled: navigator.cookieEnabled,
    language: navigator.language,
    platform: navigator.platform
  };

  console.log('📊 Network diagnostics:', results);
  return results;
};