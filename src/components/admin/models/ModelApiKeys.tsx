
import { useState } from 'react';
import { useAdmin } from '@/context/AdminContext';
import { Plus, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ModelApiKeysProps {
  provider: string;
  isExpanded: boolean;
}

export const ModelApiKeys = ({ provider, isExpanded }: ModelApiKeysProps) => {
  const { apiKeys, addApiKey, deleteApiKey, testApiKeyConnection } = useAdmin();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  // Filter API keys for this provider
  const providerKeys = apiKeys.filter(key => key.provider === provider);

  const handleAddKey = () => {
    if (!newKeyName || !newKeyValue) {
      toast.error('Please fill in all fields');
      return;
    }

    addApiKey({
      name: newKeyName,
      provider: provider,
      key: newKeyValue,
    });

    // Reset form and close dialog
    setNewKeyName('');
    setNewKeyValue('');
    setShowAddDialog(false);
    toast.success('API key added successfully');
  };

  const handleDeleteKey = async (id: string) => {
    deleteApiKey(id);
    toast.success('API key deleted successfully');
  };

  const handleTestConnection = async (id: string) => {
    try {
      const success = await testApiKeyConnection(id);
      if (success) {
        toast.success('Connection test successful');
      } else {
        toast.error('Connection test failed');
      }
    } catch (error) {
      toast.error('Error testing connection');
    }
  };

  if (!isExpanded) return null;

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Key className="h-4 w-4" />
          API Keys for {provider}
        </h4>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-2" />
              Add Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New API Key for {provider}</DialogTitle>
              <DialogDescription>
                Enter the details for your new {provider} API key.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="keyName" className="text-sm font-medium">Key Name</label>
                <Input
                  id="keyName"
                  placeholder={`e.g., ${provider} Production`}
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="keyValue" className="text-sm font-medium">API Key</label>
                <Input
                  id="keyValue"
                  type="password"
                  placeholder="Enter your API key"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddKey}>Add Key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {providerKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys added for {provider}</p>
        ) : (
          providerKeys.map((key) => (
            <div key={key.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
              <div>
                <p className="text-sm font-medium">{key.name}</p>
                <p className="text-xs text-muted-foreground">
                  Added: {new Date(key.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTestConnection(key.id)}
                >
                  Test
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteKey(key.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
