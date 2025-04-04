
import React from 'react';
import { 
  Calculator, Book, BookOpen, Globe, Atom, 
  FlaskConical, Dna, Landmark, Code, Languages, 
  Pencil, Palette, Music, Stethoscope, 
  LucideProps
} from 'lucide-react';

type IconName = 
  | 'calculator' | 'book' | 'book-open' | 'globe' | 'atom' 
  | 'flask-conical' | 'dna' | 'landmark' | 'code' | 'languages'
  | 'pencil' | 'palette' | 'music' | 'stethoscope';

interface DynamicIconProps extends LucideProps {
  name: IconName;
}

const iconComponents = {
  'calculator': Calculator,
  'book': Book,
  'book-open': BookOpen,
  'globe': Globe,
  'atom': Atom,
  'flask-conical': FlaskConical,
  'dna': Dna,
  'landmark': Landmark,
  'code': Code,
  'languages': Languages,
  'pencil': Pencil,
  'palette': Palette,
  'music': Music,
  'stethoscope': Stethoscope,
};

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, ...props }) => {
  const IconComponent = iconComponents[name];
  
  if (!IconComponent) {
    return <Book {...props} />;
  }
  
  return <IconComponent {...props} />;
};

export const iconOptions = [
  { value: 'calculator', label: 'Calculator' },
  { value: 'book', label: 'Book' },
  { value: 'book-open', label: 'Book Open' },
  { value: 'globe', label: 'Globe' },
  { value: 'atom', label: 'Atom' },
  { value: 'flask-conical', label: 'Flask' },
  { value: 'dna', label: 'DNA' },
  { value: 'landmark', label: 'Landmark' },
  { value: 'code', label: 'Code' },
  { value: 'languages', label: 'Languages' },
  { value: 'pencil', label: 'Pencil' },
  { value: 'palette', label: 'Palette' },
  { value: 'music', label: 'Music' },
  { value: 'stethoscope', label: 'Medicine' }
];
