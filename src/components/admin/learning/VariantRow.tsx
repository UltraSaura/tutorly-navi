import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(t => t.trim()).filter(t => t.length > 0);
    onChange({ ...variant, tags });
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Select 
            value={variant.language} 
            onValueChange={(value) => onChange({ ...variant, language: value })}
          >
            <SelectTrigger className="w-40">
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
        </div>
        {canRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Video URL *</Label>
          <Input
            value={variant.video_url}
            onChange={(e) => onChange({ ...variant, video_url: e.target.value })}
            placeholder="YouTube, Vimeo, or direct URL"
            required
          />
        </div>
        <div>
          <Label>Title *</Label>
          <Input
            value={variant.title}
            onChange={(e) => onChange({ ...variant, title: e.target.value })}
            placeholder="Video title in this language"
            required
          />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={variant.description || ''}
          onChange={(e) => onChange({ ...variant, description: e.target.value })}
          placeholder="Video description in this language"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Thumbnail URL</Label>
          <Input
            value={variant.thumbnail_url || ''}
            onChange={(e) => onChange({ ...variant, thumbnail_url: e.target.value })}
            placeholder="Optional thumbnail"
          />
        </div>
        <div>
          <Label>Tags</Label>
          <Input
            value={variant.tags.join(', ')}
            onChange={(e) => handleTagsChange(e.target.value)}
            placeholder="fractions, algebra, equations"
          />
        </div>
      </div>

      {variant.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {variant.tags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default VariantRow;
