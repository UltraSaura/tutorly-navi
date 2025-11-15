import { Badge } from '@/components/ui/badge';
import { MapPin, AlertCircle } from 'lucide-react';
import { resolveCurriculumPath, getCurriculumLocation } from '@/lib/curriculum';

interface CurriculumLocationProps {
  countryId: string | null;
  levelId: string | null;
  subjectId: string | null;
  domainId: string | null;
  subdomainId: string | null;
  locale?: string;
  variant?: 'full' | 'compact' | 'badges';
}

export function CurriculumLocation({
  countryId,
  levelId,
  subjectId,
  domainId,
  subdomainId,
  locale = 'en',
  variant = 'full'
}: CurriculumLocationProps) {
  const location = getCurriculumLocation(
    countryId,
    levelId,
    subjectId,
    domainId,
    subdomainId,
    locale
  );

  // Not mapped case
  if (!location) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">Not mapped yet</span>
      </div>
    );
  }

  // Full path variant
  if (variant === 'full') {
    const path = resolveCurriculumPath(
      countryId,
      levelId,
      subjectId,
      domainId,
      subdomainId,
      locale
    );
    return (
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{path}</span>
      </div>
    );
  }

  // Compact variant (just country/level/subject)
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          {location.labels.country} / {location.labels.level} / {location.labels.subject}
        </span>
      </div>
    );
  }

  // Badges variant
  if (variant === 'badges') {
    return (
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{location.labels.country}</Badge>
        <Badge variant="outline">{location.labels.level}</Badge>
        <Badge variant="secondary">
          {location.labels.subject}
        </Badge>
        {location.labels.domain && (
          <Badge variant="secondary">{location.labels.domain}</Badge>
        )}
        {location.labels.subdomain && (
          <Badge variant="secondary">{location.labels.subdomain}</Badge>
        )}
      </div>
    );
  }

  return null;
}
