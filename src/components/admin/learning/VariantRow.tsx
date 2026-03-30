import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, FileText, ChevronDown } from 'lucide-react';
import type { VideoVariant } from '@/types/learning';

const LANGUAGE_OPTIONS = [
  { code: 'en', label: '🇺🇸 English' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'ar', label: '🇸🇦 العربية' },
];

interface VariantRowProps {
  variant: VideoVariant;
  usedLanguages: string[];
  onChange: (variant: VideoVariant) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const countWords = (text: string | null | undefined): number => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

export const VariantRow = ({ variant, usedLanguages, onChange, onRemove, canRemove }: VariantRowProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const availableLanguages = LANGUAGE_OPTIONS.filter(
    lang => lang.code === variant.language || !usedLanguages.includes(lang.code)
  );

  const wordCount = countWords(variant.transcript);
  const hasTranscript = wordCount > 0;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 p-2">
        <Select 
          value={variant.language} 
          onValueChange={(value) => onChange({ ...variant, language: value })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {availableLanguages.map(lang => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Input
          value={variant.video_url}
          onChange={(e) => onChange({ ...variant, video_url: e.target.value })}
          placeholder="YouTube, Vimeo, or direct URL"
          className="flex-1"
          required
        />

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              type="button"
              className="relative"
            >
              <FileText className="h-4 w-4" />
              {hasTranscript && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
        
        {canRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove} type="button">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <div className="border-t border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">
                Transcript (optional)
              </label>
              {hasTranscript && (
                <span className="text-xs text-muted-foreground">
                  {wordCount.toLocaleString()} words
                </span>
              )}
            </div>
            <Textarea
              value={variant.transcript || ''}
              onChange={(e) => onChange({ ...variant, transcript: e.target.value || null })}
              placeholder="Paste or type the video transcript here..."
              className="min-h-[120px] resize-y"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default VariantRow;
