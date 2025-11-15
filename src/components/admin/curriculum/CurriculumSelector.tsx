import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurriculumSelector } from '@/hooks/useCurriculumSelector';
import { getLocalizedLabel } from '@/lib/curriculum';
import { MapPin } from 'lucide-react';

interface CurriculumSelectorProps {
  value: {
    curriculum_country_code?: string | null;
    curriculum_level_code?: string | null;
    curriculum_subject_id?: string | null;
    curriculum_domain_id?: string | null;
    curriculum_subdomain_id?: string | null;
  };
  onChange: (selection: {
    curriculum_country_code: string | null;
    curriculum_level_code: string | null;
    curriculum_subject_id: string | null;
    curriculum_domain_id: string | null;
    curriculum_subdomain_id: string | null;
  }) => void;
  locale?: string;
}

export function CurriculumSelector({ value, onChange, locale = 'en' }: CurriculumSelectorProps) {
  const {
    selection,
    countries,
    levels,
    subjects,
    domains,
    subdomains,
    setCountry,
    setLevel,
    setSubject,
    setDomain,
    setSubdomain,
  } = useCurriculumSelector({
    countryCode: value.curriculum_country_code || undefined,
    levelCode: value.curriculum_level_code || undefined,
    subjectId: value.curriculum_subject_id || undefined,
    domainId: value.curriculum_domain_id || undefined,
    subdomainId: value.curriculum_subdomain_id || undefined,
  });

  // Propagate changes to parent whenever selection changes
  useEffect(() => {
    onChange({
      curriculum_country_code: selection.countryCode || null,
      curriculum_level_code: selection.levelCode || null,
      curriculum_subject_id: selection.subjectId || null,
      curriculum_domain_id: selection.domainId || null,
      curriculum_subdomain_id: selection.subdomainId || null,
    });
  }, [selection, onChange]);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span>Curriculum Location</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Country Selector */}
        <div>
          <Label>Country</Label>
          <Select
            value={selection.countryCode}
            onValueChange={setCountry}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.id} value={country.id}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Level Selector */}
        <div>
          <Label>Level</Label>
          <Select
            value={selection.levelCode}
            onValueChange={setLevel}
            disabled={!selection.countryCode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {levels.map((level) => (
                <SelectItem key={level.id} value={level.id}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subject Selector */}
        <div>
          <Label>Subject</Label>
          <Select
            value={selection.subjectId}
            onValueChange={setSubject}
            disabled={!selection.levelCode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {getLocalizedLabel(subject.labels, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Domain Selector */}
        <div>
          <Label>Domain</Label>
          <Select
            value={selection.domainId}
            onValueChange={setDomain}
            disabled={!selection.subjectId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select domain" />
            </SelectTrigger>
            <SelectContent>
              {domains.map((domain) => (
                <SelectItem key={domain.id} value={domain.id}>
                  {getLocalizedLabel(domain.labels, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subdomain Selector */}
        <div className="md:col-span-2">
          <Label>Subdomain</Label>
          <Select
            value={selection.subdomainId}
            onValueChange={setSubdomain}
            disabled={!selection.domainId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subdomain" />
            </SelectTrigger>
            <SelectContent>
              {subdomains.map((subdomain) => (
                <SelectItem key={subdomain.id} value={subdomain.id}>
                  {subdomain.code} - {getLocalizedLabel(subdomain.labels, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
