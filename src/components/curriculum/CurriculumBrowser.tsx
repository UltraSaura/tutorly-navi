import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Calculator, BookOpen } from 'lucide-react';
import { useCurriculumSubjects, useCurriculumDomains, useCurriculumSubdomains } from '@/hooks/useCurriculumBundle';
import { useUserSchoolLevel } from '@/hooks/useUserSchoolLevel';
import { getLocalizedLabel } from '@/lib/curriculum';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator,
  BookOpen,
};

export default function CurriculumBrowser() {
  const { data: userLevel } = useUserSchoolLevel();
  const countryId = 'fr'; // Default to France, could be from user profile
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const subjects = useCurriculumSubjects(countryId, userLevel?.level || 'cm1');
  const domains = useCurriculumDomains(countryId, userLevel?.level || 'cm1', selectedSubject || '');
  const subdomains = useCurriculumSubdomains(
    countryId,
    userLevel?.level || 'cm1',
    selectedSubject || '',
    selectedDomain || ''
  );

  const locale = 'fr'; // Could come from i18n context

  // Subject selection view
  if (!selectedSubject) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Curriculum</h1>
          <p className="text-muted-foreground">
            Explore your curriculum by subject
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const IconComponent = subject.icon ? iconMap[subject.icon] : null;
            
            return (
              <Card
                key={subject.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedSubject(subject.id)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {IconComponent && (
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: subject.color }}
                      >
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <CardTitle>{getLocalizedLabel(subject.labels, locale)}</CardTitle>
                      <CardDescription>
                        {subject.domains.length} domain{subject.domains.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const currentSubject = subjects.find((s) => s.id === selectedSubject);
  if (!currentSubject) return null;

  // Domain selection view
  if (!selectedDomain) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSubject(null)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge style={{ backgroundColor: currentSubject.color }} className="text-white">
              {getLocalizedLabel(currentSubject.labels, locale)}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Domains</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {domains.map((domain) => (
            <Card
              key={domain.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedDomain(domain.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {getLocalizedLabel(domain.labels, locale)}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {domain.code} • {domain.subdomains.length} subdomain{domain.subdomains.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentDomain = domains.find((d) => d.id === selectedDomain);
  if (!currentDomain) return null;

  // Subdomain and skills view
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedDomain(null)}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge style={{ backgroundColor: currentSubject.color }} className="text-white">
            {getLocalizedLabel(currentSubject.labels, locale)}
          </Badge>
          <span className="text-muted-foreground">/</span>
          <Badge variant="outline">{currentDomain.code}</Badge>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          {getLocalizedLabel(currentDomain.labels, locale)}
        </h1>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {subdomains.map((subdomain) => (
          <AccordionItem key={subdomain.id} value={subdomain.id}>
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{subdomain.code}</Badge>
                <span className="font-medium text-left">
                  {getLocalizedLabel(subdomain.labels, locale)}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {subdomain.skills && subdomain.skills.length > 0 ? (
                  subdomain.skills.map((skill) => (
                    <Card key={skill.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="text-xs">
                            {skill.code}
                          </Badge>
                          <p className="text-sm flex-1">
                            {getLocalizedLabel(skill.labels, locale)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No skills defined yet</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
