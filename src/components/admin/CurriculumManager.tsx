import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileJson, CheckCircle, XCircle, Loader2, Search, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useObjectives, useCurriculumStats } from '@/hooks/useCurriculumData';
import { useCurriculumCountries, useCurriculumLevels, useAllCurriculumSubjects } from '@/hooks/useCurriculumBundle';
import { getLocalizedLabel, getDomainsBySubject, getSubdomainsByDomain } from '@/lib/curriculum';
import type { ImportCounts } from '@/types/curriculum';
import { toast } from '@/hooks/use-toast';

export default function CurriculumManager() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    counts?: ImportCounts;
    error?: string;
  } | null>(null);

  // Filters
  const [filterCountry, setFilterCountry] = useState('fr');
  const [level, setLevel] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState('');
  const [domain, setDomain] = useState<string>('');
  const [subdomain, setSubdomain] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  
  // New curriculum bundle hooks
  const countries = useCurriculumCountries();
  const levels = useCurriculumLevels(filterCountry);
  const allSubjects = useAllCurriculumSubjects(filterCountry);

  // Get filtered domains and subdomains from curriculumBundle.json
  const filteredDomains = useMemo(() => {
    if (!filterCountry || !level || !filterSubject) return [];
    return getDomainsBySubject(filterCountry, level, filterSubject);
  }, [filterCountry, level, filterSubject]);

  const filteredSubdomains = useMemo(() => {
    if (!filterCountry || !level || !filterSubject || !domain) return [];
    return getSubdomainsByDomain(filterCountry, level, filterSubject, domain);
  }, [filterCountry, level, filterSubject, domain]);

  // Queries
  const { data: objectives, refetch: refetchObjectives } = useObjectives({
    level: level || undefined,
    domain: domain || undefined,
    subdomain: subdomain || undefined,
    search: search || undefined,
  });
  const { data: stats, refetch: refetchStats } = useCurriculumStats();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
      setImportResult(null);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please select a valid JSON file',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      // Read file content
      const fileContent = await selectedFile.text();
      const bundleData = JSON.parse(fileContent);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call edge function
      const response = await supabase.functions.invoke('import-curriculum-bundle', {
        body: bundleData,
      });

      if (response.error) throw response.error;

      setImportResult({
        success: true,
        counts: response.data.counts,
      });

      toast({
        title: 'Import successful',
        description: 'Curriculum data imported successfully',
      });

      // Refresh data
      refetchObjectives();
      refetchStats();
    } catch (error: any) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        error: error.message || 'Import failed',
      });

      toast({
        title: 'Import failed',
        description: error.message || 'An error occurred during import',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetFilters = () => {
    setFilterCountry('fr');
    setLevel('');
    setFilterSubject('');
    setDomain('');
    setSubdomain('');
    setSearch('');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Curriculum Manager</h1>
        <p className="text-muted-foreground">Import and manage curriculum data from JSON bundles</p>
      </div>

      {/* Statistics Panel */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Database Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {Object.entries(stats).map(([table, count]) => (
                <div key={table} className="text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {table.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import Curriculum Bundle</CardTitle>
          <CardDescription>
            Upload a bundle.json file to import curriculum data into Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bundle-file">Select bundle.json file</Label>
            <div className="flex gap-2">
              <Input
                id="bundle-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                disabled={isImporting}
              />
              <Button
                onClick={handleImport}
                disabled={!selectedFile || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import to Supabase
                  </>
                )}
              </Button>
            </div>
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileJson className="h-4 w-4" />
                {selectedFile.name}
              </div>
            )}
          </div>

          {/* Import Result */}
          {importResult && (
            <Alert variant={importResult.success ? 'default' : 'destructive'}>
              {importResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {importResult.success ? 'Import Successful' : 'Import Failed'}
              </AlertTitle>
              <AlertDescription>
                {importResult.success && importResult.counts ? (
                  <div className="mt-2 space-y-1">
                    {Object.entries(importResult.counts).map(([table, count]) => (
                      <div key={table} className="flex justify-between text-sm">
                        <span className="capitalize">{table.replace('_', ' ')}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{importResult.error}</p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Viewer Section */}
      <Card>
        <CardHeader>
          <CardTitle>Curriculum Viewer</CardTitle>
          <CardDescription>
            Browse objectives and success criteria with filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country-filter">Country</Label>
              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger id="country-filter">
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
            
            <div className="space-y-2">
              <Label htmlFor="level-filter">Level</Label>
              <Select value={level} onValueChange={(newLevel) => {
                setLevel(newLevel);
                setFilterSubject('');
                setDomain('');
                setSubdomain('');
              }}>
                <SelectTrigger id="level-filter">
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((lvl) => (
                    <SelectItem key={lvl.id} value={lvl.id}>
                      {lvl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject-filter">Subject</Label>
              <Select value={filterSubject} onValueChange={(newSubject) => {
                setFilterSubject(newSubject);
                setDomain('');
                setSubdomain('');
              }}>
                <SelectTrigger id="subject-filter">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  {allSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {getLocalizedLabel(subject.labels, 'en')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain-filter">Domain</Label>
              <Select value={domain} onValueChange={(newDomain) => {
                setDomain(newDomain);
                setSubdomain('');
              }} disabled={!filterSubject}>
                <SelectTrigger id="domain-filter">
                  <SelectValue placeholder="All domains" />
                </SelectTrigger>
                <SelectContent>
                  {filteredDomains.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {getLocalizedLabel(d.labels, 'en')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subdomain-filter">Subdomain</Label>
              <Select value={subdomain} onValueChange={setSubdomain} disabled={!domain}>
                <SelectTrigger id="subdomain-filter">
                  <SelectValue placeholder="All subdomains" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubdomains.map((sd) => (
                    <SelectItem key={sd.id} value={sd.id}>
                      {getLocalizedLabel(sd.labels, 'en')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search-filter">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-filter"
                  placeholder="Search objectives..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {objectives?.length || 0} objective(s) found
            </div>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>

          {/* Objectives List */}
          {objectives && objectives.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-2">
              {objectives.map((objective) => {
                // Determine subject badge color based on domain
                const subjectBadgeColor = objective.domain?.toLowerCase().includes('number') || 
                                           objective.domain?.toLowerCase().includes('géométrie') ||
                                           objective.domain?.toLowerCase().includes('geometry')
                  ? 'hsl(var(--chart-1))' 
                  : 'hsl(var(--chart-2))';
                
                return (
                  <AccordionItem key={objective.id} value={objective.id} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-start gap-2 text-left">
                        <div className="flex-1">
                          <div className="font-medium">{objective.text}</div>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="outline">{objective.level}</Badge>
                            {objective.domain && (
                              <Badge 
                                style={{ backgroundColor: subjectBadgeColor }}
                                className="text-white"
                              >
                                {objective.domain}
                              </Badge>
                            )}
                            <Badge variant="secondary">{objective.subdomain}</Badge>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-2 mt-2">
                      <div className="text-sm font-medium">Success Criteria:</div>
                      {objective.success_criteria && objective.success_criteria.length > 0 ? (
                        <ul className="space-y-2">
                          {objective.success_criteria.map((sc) => (
                            <li key={sc.id} className="text-sm pl-4 border-l-2 border-primary/20">
                              {sc.text}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No success criteria defined</p>
                      )}
                      {objective.notes_from_prog && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <div className="text-xs font-medium mb-1">Notes:</div>
                          <div className="text-sm">{objective.notes_from_prog}</div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
            </Accordion>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No objectives found. Try adjusting your filters or import curriculum data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
