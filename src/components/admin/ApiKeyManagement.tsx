
import { useAdmin } from '@/context/AdminContext';
import { toast } from 'sonner';
import ApiKeyList from './api-keys/ApiKeyList';
import AddKeyDialog from './api-keys/AddKeyDialog';
import ApiSecurityAlert from './api-keys/ApiSecurityAlert';

const ApiKeyManagement = () => {
  const { apiKeys, addApiKey, deleteApiKey, testApiKeyConnection } = useAdmin();
  
  const handleAddKey = (name: string, provider: string, value: string) => {
    const obfuscatedKey = value.substring(0, 5) + '••••••••••••••••••••••••••••••••••';
    
    addApiKey({
      name,
      provider,
      key: obfuscatedKey,
    });
  };
  
  const handleDeleteKey = (id: string) => {
    deleteApiKey(id);
  };
  
  const handleTestConnection = async (id: string) => {
    try {
      const success = await testApiKeyConnection(id);
      if (success) {
        toast.success('Connection test successful!');
      } else {
        toast.error('Connection test failed. Please check your API key.');
      }
    } catch (error) {
      toast.error('Error testing connection');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Key Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage API keys for different AI providers
          </p>
        </div>
        
        <AddKeyDialog onAddKey={handleAddKey} />
      </div>
      
      <ApiSecurityAlert />
      
      <ApiKeyList 
        apiKeys={apiKeys} 
        onDeleteKey={handleDeleteKey} 
        onTestConnection={handleTestConnection} 
      />
    </div>
  );
};

export default ApiKeyManagement;
