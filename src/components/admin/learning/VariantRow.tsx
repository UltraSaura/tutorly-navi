import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
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

export const VariantRow = ({ variant, usedLanguages, onChange, onRemove, canRemove }: VariantRowProps) => {
  const availableLanguages = LANGUAGE_OPTIONS.filter(
    lang => lang.code === variant.language || !usedLanguages.includes(lang.code)
  );

  return (
    <div className="flex items-center gap-2">
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
      
      {canRemove && (
        <Button variant="ghost" size="icon" onClick={onRemove} type="button">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default VariantRow;
