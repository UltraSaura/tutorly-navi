import { useNavigate } from 'react-router-dom';
import { useUserCurriculumProfile } from '@/hooks/useUserCurriculumProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, AlertCircle, Settings, ArrowRight, Loader2 } from 'lucide-react';
import { getLocalizedLabel, getSubject, getDomain, getSubdomain } from '@/lib/curriculum';

interface GroupedTopics {
  [subjectId: string]: {
    subjectLabel: string;
    subjectColor?: string;
    domains: {
      [domainId: string]: {
        domainLabel: string;
        subdomains: {
          [subdomainId: string]: {
            subdomainLabel: string;
            topics: any[];
          };
        };
      };
    };
  };
}

export default function MyProgramPage() {
  const navigate = useNavigate();
  const { profile, isLoading: profileLoading, hasProfile } = useUserCurriculumProfile();

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ['myProgramTopics', profile?.countryCode, profile?.levelCode],
    queryFn: async () => {
      if (!profile) return [];
      
      const { data, error } = await supabase
        .from('learning_topics')
        .select(`
          *,
          learning_categories!inner (
            name,
            learning_subjects!inner (
              name,
              slug,
              color_scheme
            )
          )
        `)
        .eq('curriculum_country_code', profile.countryCode)
        .eq('curriculum_level_code', profile.levelCode)
        .eq('is_active', true)
        .order('order_index');
      
      if (error) throw error;
      return data || [];
    },
    enabled: hasProfile,
  });

  const groupedTopics: GroupedTopics = {};
  
  if (topics && profile) {
    topics.forEach((topic: any) => {
      const subjectId = topic.curriculum_subject_id;
      const domainId = topic.curriculum_domain_id;
      const subdomainId = topic.curriculum_subdomain_id;
      
      if (!subjectId || !domainId || !subdomainId) return;
      
      const subject = getSubject(profile.countryCode, profile.levelCode, subjectId);
      const domain = getDomain(profile.countryCode, profile.levelCode, subjectId, domainId);
      const subdomain = getSubdomain(profile.countryCode, profile.levelCode, subjectId, domainId, subdomainId);
      
      if (!subject || !domain || !subdomain) return;
      
      if (!groupedTopics[subjectId]) {
        groupedTopics[subjectId] = {
          subjectLabel: getLocalizedLabel(subject.labels, 'en'),
          subjectColor: subject.color,
          domains: {},
        };
      }
      
      if (!groupedTopics[subjectId].domains[domainId]) {
        groupedTopics[subjectId].domains[domainId] = {
          domainLabel: getLocalizedLabel(domain.labels, 'en'),
          subdomains: {},
        };
      }
      
      if (!groupedTopics[subjectId].domains[domainId].subdomains[subdomainId]) {
        groupedTopics[subjectId].domains[domainId].subdomains[subdomainId] = {
          subdomainLabel: getLocalizedLabel(subdomain.labels, 'en'),
          topics: [],
        };
      }
      
      groupedTopics[subjectId].domains[domainId].subdomains[subdomainId].topics.push(topic);
    });
  }

  if (profileLoading || topicsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your program...</p>
        </div>
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold">Setup Required</h2>
            <p className="text-muted-foreground">
              Please select your school country and level to see your personalized learning program.
            </p>
            <Button onClick={() => navigate('/profile')} className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Go to Profile Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!topics || topics.length === 0) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">My Program</h1>
            <p className="text-muted-foreground">
              {profile.countryName} - {profile.levelLabel}
            </p>
          </div>
          
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-bold">Program Coming Soon</h2>
              <p className="text-muted-foreground">
                Your program is not fully available yet. New lessons are being added regularly.
              </p>
              <Button onClick={() => navigate('/learning')} variant="outline">
                Browse All Subjects
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Program</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{profile.countryName}</Badge>
            <Badge variant="secondary">{profile.levelLabel}</Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/profile')}
              className="ml-auto"
            >
              <Settings className="mr-2 h-4 w-4" />
              Change Program
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedTopics).map(([subjectId, subjectData]) => (
            <div key={subjectId} className="space-y-4">
              <div 
                className="p-4 rounded-lg border-l-4"
                style={{ borderColor: subjectData.subjectColor || 'hsl(var(--primary))' }}
              >
                <h2 className="text-2xl font-bold">{subjectData.subjectLabel}</h2>
              </div>

              {Object.entries(subjectData.domains).map(([domainId, domainData]) => (
                <div key={domainId} className="ml-4 space-y-3">
                  <h3 className="text-xl font-semibold text-muted-foreground">
                    {domainData.domainLabel}
                  </h3>

                  {Object.entries(domainData.subdomains).map(([subdomainId, subdomainData]) => (
                    <div key={subdomainId} className="ml-4 space-y-2">
                      <h4 className="text-lg font-medium">{subdomainData.subdomainLabel}</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {subdomainData.topics.map((topic: any) => {
                          const subjectSlug = topic.learning_categories?.learning_subjects?.slug;
                          return (
                            <Card 
                              key={topic.id}
                              className="hover:shadow-lg transition-shadow cursor-pointer"
                              onClick={() => navigate(`/learning/${subjectSlug}/${topic.slug}#lesson-section`)}
                            >
                              <CardContent className="p-4">
                                <h5 className="font-semibold mb-2 line-clamp-2">{topic.name}</h5>
                                {topic.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                    {topic.description}
                                  </p>
                                )}
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {topic.video_count} videos
                                  </span>
                                  <ArrowRight className="h-4 w-4" />
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
