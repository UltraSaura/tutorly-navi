import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';

import { Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ApiSecurityAlert = () => {
  const ui = useInterfaceTranslation();
  return (
    <Alert>
      <Key className="h-4 w-4" />
      <AlertDescription>
        {ui("API keys are securely stored and encrypted. Only add keys from trusted providers.")}
      </AlertDescription>
    </Alert>
  );
};

export default ApiSecurityAlert;
