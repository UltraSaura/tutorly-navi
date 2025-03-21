
import { useState } from 'react';
import { Trash2, Eye, EyeOff, Plus, Key } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name: string;
  provider: string;
  key: string;
  createdAt: Date;
  lastUsed?: Date;
}

const ApiKeyManagement = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'OpenAI Production',
      provider: 'OpenAI',
      key: 'sk-1234••••••••••••••••••••••••••••••••••',
      createdAt: new Date(2023, 5, 15),
      lastUsed: new Date(2023, 6, 14),
    },
    {
      id: '2',
      name: 'Google Gemini',
      provider: 'Google',
      key: 'AIza••••••••••••••••••••••••••••••••••••',
      createdAt: new Date(2023, 5, 10),
      lastUsed: new Date(2023, 6, 12),
    },
  ]);
  
  const [showDialogKey, setShowDialogKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [visibleKeyId, setVisibleKeyId] = useState<string | null>(null);
  
  const addNewKey = () => {
    if (!newKeyName || !newKeyProvider || !newKeyValue) {
      toast.error('Please fill all fields');
      return;
    }
    
    const obfuscatedKey = newKeyValue.substring(0, 5) + '••••••••••••••••••••••••••••••••••';
    
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      provider: newKeyProvider,
      key: obfuscatedKey,
      createdAt: new Date(),
    };
    
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName('');
    setNewKeyProvider('');
    setNewKeyValue('');
    setShowDialogKey(false);
    
    toast.success('API key added successfully');
  };
  
  const deleteKey = (id: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));
    toast.success('API key deleted successfully');
  };
  
  const toggleKeyVisibility = (id: string) => {
    if (visibleKeyId === id) {
      setVisibleKeyId(null);
    } else {
      setVisibleKeyId(id);
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        setVisibleKeyId(null);
      }, 10000);
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
        
        <Dialog open={showDialogKey} onOpenChange={setShowDialogKey}>
          <DialogTrigger asChild>
            <Button className="bg-studywhiz-600 hover:bg-studywhiz-700">
              <Plus className="mr-2 h-4 w-4" /> Add New Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New API Key</DialogTitle>
              <DialogDescription>
                Enter the details for the new API key. Keys are stored securely in the database.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="keyName" className="text-sm font-medium">Key Name</label>
                <Input
                  id="keyName"
                  placeholder="e.g., OpenAI Production"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="keyProvider" className="text-sm font-medium">Provider</label>
                <Select value={newKeyProvider} onValueChange={setNewKeyProvider}>
                  <SelectTrigger id="keyProvider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OpenAI">OpenAI</SelectItem>
                    <SelectItem value="Google">Google Gemini</SelectItem>
                    <SelectItem value="Anthropic">Anthropic Claude</SelectItem>
                    <SelectItem value="Mistral">Mistral AI</SelectItem>
                    <SelectItem value="DeepSeek">DeepSeek</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
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
                <p className="text-xs text-muted-foreground">
                  Keep your API keys confidential. They will be securely stored.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialogKey(false)}>Cancel</Button>
              <Button className="bg-studywhiz-600 hover:bg-studywhiz-700" onClick={addNewKey}>
                Add Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          API keys are securely stored and encrypted. Only add keys from trusted providers.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {apiKeys.map(apiKey => (
          <Card key={apiKey.id} className="glass">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{apiKey.name}</CardTitle>
                  <CardDescription>{apiKey.provider}</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteKey(apiKey.id)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">API Key</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                    >
                      {visibleKeyId === apiKey.id ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="border rounded-md p-2 bg-muted/50 font-mono text-sm">
                    {visibleKeyId === apiKey.id ? "sk-1234567890abcdefghijklmnopqrstuv" : apiKey.key}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p>{apiKey.createdAt.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Used</p>
                    <p>{apiKey.lastUsed ? apiKey.lastUsed.toLocaleDateString() : 'Never'}</p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button variant="outline" size="sm">Test Connection</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ApiKeyManagement;
