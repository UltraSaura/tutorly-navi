import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface AddKeyDialogProps {
  onAddKey: (name: string, provider: string, value: string) => void;
}

const AddKeyDialog = ({ onAddKey }: AddKeyDialogProps) => {
  const ui = useInterfaceTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyProvider, setKeyProvider] = useState('');
  const [keyValue, setKeyValue] = useState('');
  
  const handleAddKey = () => {
    if (!keyName || !keyProvider || !keyValue) {
      toast.error('Please fill all fields');
      return;
    }
    
    onAddKey(keyName, keyProvider, keyValue);
    
    // Reset form
    setKeyName('');
    setKeyProvider('');
    setKeyValue('');
    setShowDialog(false);
  };
  
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button className="bg-stuwy-600 hover:bg-stuwy-700">
          <Plus className="mr-2 h-4 w-4" /> {ui("Add New Key")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{ui("Add New API Key")}</DialogTitle>
          <DialogDescription>
            {ui("Enter the details for the new API key. Keys are stored securely in the database.")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="keyName" className="text-sm font-medium">{ui("Key Name")}</label>
            <Input
              id="keyName"
              placeholder={ui("e.g., OpenAI Production")}
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="keyProvider" className="text-sm font-medium">{ui("Provider")}</label>
            <Select value={keyProvider} onValueChange={setKeyProvider}>
              <SelectTrigger id="keyProvider">
                <SelectValue placeholder={ui("Select provider")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OpenAI">OpenAI</SelectItem>
                <SelectItem value="Google">Google</SelectItem>
                <SelectItem value="Anthropic">Anthropic</SelectItem>
                <SelectItem value="Mistral AI">Mistral AI</SelectItem>
                <SelectItem value="DeepSeek">DeepSeek</SelectItem>
                <SelectItem value="xAI">xAI</SelectItem>
                <SelectItem value="Other">{ui("Other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="keyValue" className="text-sm font-medium">{ui("API Key")}</label>
            <Input
              id="keyValue"
              type="password"
              placeholder={ui("Enter your API key")}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {ui("Keep your API keys confidential. They will be securely stored.")}
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDialog(false)}>{ui("Cancel")}</Button>
          <Button className="bg-stuwy-600 hover:bg-stuwy-700" onClick={handleAddKey}>
            {ui("Add Key")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddKeyDialog;
