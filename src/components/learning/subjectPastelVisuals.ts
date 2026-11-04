import {
  BookOpen,
  Calculator,
  FlaskConical,
  Globe,
  Landmark,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';

export const subjectPastelColors = {
  mathematiques: { bg: '#E6EDFF', icon: '#285AC4' },
  francais: { bg: '#F7E8FA', icon: '#9445A8' },
  sciences: { bg: '#E5F7EB', icon: '#168A52' },
  histoire: { bg: '#FFF1D9', icon: '#B77716' },
  geographie: { bg: '#E2F2FF', icon: '#2584B8' },
  anglais: { bg: '#F0F1F5', icon: '#687387' },
  default: { bg: '#F3F6FA', icon: '#667085' },
} as const;

export const subjectPastelIcons: Record<string, LucideIcon> = {
  mathematiques: Calculator,
  francais: BookOpen,
  sciences: FlaskConical,
  histoire: Landmark,
  geographie: Globe,
  anglais: MoreHorizontal,
};

export const normalizeSubjectKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

export const getSubjectPastelVisuals = (slug: string, colorScheme?: string | null) => {
  const key = normalizeSubjectKey(slug) as keyof typeof subjectPastelColors;
  const mapped = subjectPastelColors[key] ?? subjectPastelColors.default;
  return {
    ...mapped,
    iconBg: colorScheme && !colorScheme.startsWith('bg-') ? colorScheme : mapped.bg,
  };
};
