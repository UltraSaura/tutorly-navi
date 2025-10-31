import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, WifiOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { testAIServiceConnection, getNetworkDiagnostics, ConnectionTestResult } from '@/utils/connectionTest';
import { toast } from 'sonner';

const ConnectionDiagnostics = () => {
  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState<ConnectionTestResult | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const runConnectionTest = async () => {
    setTesting(true);
    try {
      console.log('🔍 Starting connection diagnostics...');
      
      const [testResult, networkDiag] = await Promise.all([
        testAIServiceConnection(),
        getNetworkDiagnostics()
      ]);

      setLastTest(testResult);
      setDiagnostics(networkDiag);

      if (testResult.success) {
        toast.success(`Connection successful via ${testResult.method} (${testResult.responseTime}ms)`);
      } else {
        toast.error(`Connection failed: ${testResult.error}`);
      }
    } catch (error: any) {
      toast.error('Diagnostic test failed: ' + error.message);
      setLastTest({
        success: false,
        method: 'failed',
        error: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (result: ConnectionTestResult) => {
    if (result.success) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getMethodBadge = (method: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      supabase: "default",
      direct: "secondary", 
      failed: "destructive"
    };
    
    return <Badge variant={variants[method] || "secondary"}>{method}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Connection Diagnostics</h2>
          <p className="text-muted-foreground">
            Test AI service connectivity and diagnose connection issues
          </p>
        </div>
        
        <Button onClick={runConnectionTest} disabled={testing}>
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Wifi className="mr-2 h-4 w-4" />
              Run Test
            </>
          )}
        </Button>
      </div>

      {lastTest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(lastTest)}
              Connection Test Result
            </CardTitle>
            <CardDescription>
              Last tested: {new Date().toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className={lastTest.success ? "text-green-600" : "text-red-600"}>
                  {lastTest.success ? "Connected" : "Failed"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Method</p>
                {getMethodBadge(lastTest.method)}
              </div>
              <div>
                <p className="text-sm font-medium">Response Time</p>
                <p>{lastTest.responseTime ? `${lastTest.responseTime}ms` : "N/A"}</p>
              </div>
            </div>
            
            {lastTest.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm font-medium text-red-800">Error Details:</p>
                <p className="text-sm text-red-600 font-mono">{lastTest.error}</p>
              </div>
            )}
            
            {lastTest.details && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">Technical Details</summary>
                <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto">
                  {JSON.stringify(lastTest.details, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {diagnostics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {diagnostics.online ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              Network Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Online Status:</p>
                <p className={diagnostics.online ? "text-green-600" : "text-red-600"}>
                  {diagnostics.online ? "Online" : "Offline"}
                </p>
              </div>
              <div>
                <p className="font-medium">Browser:</p>
                <p>{diagnostics.userAgent.split(' ').pop()}</p>
              </div>
              <div>
                <p className="font-medium">Platform:</p>
                <p>{diagnostics.platform}</p>
              </div>
              <div>
                <p className="font-medium">Language:</p>
                <p>{diagnostics.language}</p>
              </div>
              {diagnostics.connection && (
                <>
                  <div>
                    <p className="font-medium">Connection Type:</p>
                    <p>{diagnostics.connection.effectiveType || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Downlink:</p>
                    <p>{diagnostics.connection.downlink || 'Unknown'} Mbps</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Troubleshooting Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• If connection fails, try refreshing the page</p>
          <p>• Check that API keys are configured in Supabase secrets</p>
          <p>• Verify your internet connection is stable</p>
          <p>• Try selecting a different AI model</p>
          <p>• Contact support if issues persist</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectionDiagnostics;