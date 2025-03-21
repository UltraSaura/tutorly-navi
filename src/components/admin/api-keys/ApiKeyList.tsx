
import { ApiKey } from '@/context/AdminContext';
import ApiKeyCard from './ApiKeyCard';

interface ApiKeyListProps {
  apiKeys: ApiKey[];
  onDeleteKey: (id: string) => void;
  onTestConnection: (id: string) => Promise<void>;
}

const ApiKeyList = ({ apiKeys, onDeleteKey, onTestConnection }: ApiKeyListProps) => {
  if (apiKeys.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg">
        <p className="text-muted-foreground">No API keys added yet. Add your first API key to get started.</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {apiKeys.map(apiKey => (
        <ApiKeyCard 
          key={apiKey.id} 
          apiKey={apiKey} 
          onDelete={onDeleteKey} 
          onTest={onTestConnection} 
        />
      ))}
    </div>
  );
};

export default ApiKeyList;
