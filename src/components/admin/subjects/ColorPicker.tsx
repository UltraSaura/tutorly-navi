import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';
import { hexToRgb, parseColorToHex, isValidColorFormat } from '@/utils/colorUtils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  format?: 'rgb' | 'hex';
}

export function ColorPicker({ value, onChange, format = 'rgb' }: ColorPickerProps) {
  const [hexValue, setHexValue] = useState(() => parseColorToHex(value));
  const [textValue, setTextValue] = useState(value);
  const [isValid, setIsValid] = useState(true);

  // Update internal state when prop value changes
  useEffect(() => {
    setTextValue(value);
    setHexValue(parseColorToHex(value));
    setIsValid(isValidColorFormat(value) || !value);
  }, [value]);

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHexValue(newHex);
    
    // Convert to desired format before saving
    const colorToSave = format === 'rgb' ? hexToRgb(newHex) : newHex;
    setTextValue(colorToSave);
    onChange(colorToSave);
    setIsValid(true);
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTextValue(newValue);
    
    // Validate the input
    const valid = isValidColorFormat(newValue);
    setIsValid(valid);
    
    if (valid) {
      // Update hex value for the color picker
      setHexValue(parseColorToHex(newValue));
      onChange(newValue);
    }
  };

  const handleTextInputBlur = () => {
    // If invalid on blur, revert to last valid value
    if (!isValid && value) {
      setTextValue(value);
      setIsValid(true);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Color preview swatch */}
      <div
        className="w-8 h-8 rounded border border-border flex-shrink-0 cursor-pointer relative overflow-hidden"
        style={{ backgroundColor: textValue || '#000000' }}
        title="Click to pick color"
      >
        <input
          type="color"
          value={hexValue}
          onChange={handleColorPickerChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          title="Pick a color"
        />
      </div>
      
      {/* Color picker button (visual indicator) */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="relative w-10 h-10 p-0 flex-shrink-0"
        title="Open color picker"
      >
        <Palette className="w-4 h-4" />
        <input
          type="color"
          value={hexValue}
          onChange={handleColorPickerChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          title="Pick a color"
        />
      </Button>
      
      {/* Text input for manual entry */}
      <Input
        value={textValue}
        onChange={handleTextInputChange}
        onBlur={handleTextInputBlur}
        className={`flex-1 min-w-[140px] font-mono text-sm ${!isValid ? 'border-destructive' : ''}`}
        placeholder={format === 'rgb' ? 'rgb(255, 192, 203)' : '#FFC0CB'}
        title={format === 'rgb' ? 'Enter RGB color (e.g., rgb(255, 192, 203))' : 'Enter HEX color (e.g., #FFC0CB)'}
      />
    </div>
  );
}
