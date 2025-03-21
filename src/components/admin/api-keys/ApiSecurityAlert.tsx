
import { Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ApiSecurityAlert = () => {
  return (
    <Alert>
      <Key className="h-4 w-4" />
      <AlertDescription>
        API keys are securely stored and encrypted. Only add keys from trusted providers.
      </AlertDescription>
    </Alert>
  );
};

export default ApiSecurityAlert;
