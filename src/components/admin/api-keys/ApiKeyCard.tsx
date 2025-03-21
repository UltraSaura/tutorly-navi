
import { useState } from 'react';
import { Trash2, Eye, EyeOff, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ApiKey } from '@/context/AdminContext';

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onDelete: (id: string) => void;
  onTest: (id: string) => Promise<void>;
}

const ApiKeyCard = ({ apiKey, onDelete, onTest }: ApiKeyCardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const toggleKeyVisibility = () => {
    setIsVisible(!isVisible);
    
    // Auto-hide after 10 seconds
    if (!isVisible) {
      setTimeout(() => {
        setIsVisible(false);
      }, 10000);
    }
  };

  return (
    <Card className="glass">
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
            onClick={() => onDelete(apiKey.id)}
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
                onClick={toggleKeyVisibility}
              >
                {isVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="border rounded-md p-2 bg-muted/50 font-mono text-sm">
              {isVisible ? "sk-1234567890abcdefghijklmnopqrstuv" : apiKey.key}
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onTest(apiKey.id)}
            >
              Test Connection
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeyCard;
