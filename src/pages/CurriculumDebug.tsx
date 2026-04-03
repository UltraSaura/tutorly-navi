import { useState, useEffect } from 'react';
import {
  getCountries,
  getLevelsByCountry,
  getSubjects,
  getDomainsBySubject,
  getSubdomainsByDomain,
  getLocalizedLabel,
} from '@/lib/curriculum';
import type {
  CurriculumCountry,
  CurriculumLevel,
  CurriculumSubject,
  CurriculumDomain,
  CurriculumSubdomain,
} from '@/types/curriculum';

export default function CurriculumDebug() {
  const [selectedCountry, setSelectedCountry] = useState('fr');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [currentNode, setCurrentNode] = useState<any>(null);
  const [selectedSubdomainForJson, setSelectedSubdomainForJson] = useState<string>('');

  const countries = getCountries();
  const levels = selectedCountry ? getLevelsByCountry(selectedCountry) : [];
  const subjects = selectedCountry && selectedLevel ? getSubjects(selectedCountry, selectedLevel) : [];
  const domains =
    selectedCountry && selectedLevel && selectedSubject
      ? getDomainsBySubject(selectedCountry, selectedLevel, selectedSubject)
      : [];
  const subdomains =
    selectedCountry && selectedLevel && selectedSubject && selectedDomain
      ? getSubdomainsByDomain(selectedCountry, selectedLevel, selectedSubject, selectedDomain)
      : [];

  // Reset cascading selections
  useEffect(() => {
    setSelectedLevel('');
    setSelectedSubject('');
    setSelectedDomain('');
    setSelectedSubdomainForJson('');
  }, [selectedCountry]);

  useEffect(() => {
    setSelectedSubject('');
    setSelectedDomain('');
    setSelectedSubdomainForJson('');
  }, [selectedLevel]);

  useEffect(() => {
    setSelectedDomain('');
    setSelectedSubdomainForJson('');
  }, [selectedSubject]);

  useEffect(() => {
    setSelectedSubdomainForJson('');
  }, [selectedDomain]);

  // Update current node for JSON preview
  useEffect(() => {
    if (selectedSubdomainForJson && selectedDomain) {
      const subdomain = subdomains.find((s) => s.id === selectedSubdomainForJson);
      setCurrentNode(subdomain);
    } else if (selectedDomain) {
      const domain = domains.find((d) => d.id === selectedDomain);
      setCurrentNode(domain);
    } else if (selectedSubject) {
      const subject = subjects.find((s) => s.id === selectedSubject);
      setCurrentNode(subject);
    } else if (selectedLevel) {
      const level = levels.find((l) => l.id === selectedLevel);
      setCurrentNode(level);
    } else if (selectedCountry) {
      const country = countries.find((c) => c.id === selectedCountry);
      setCurrentNode(country);
    } else {
      setCurrentNode(null);
    }
  }, [
    selectedCountry,
    selectedLevel,
    selectedSubject,
    selectedDomain,
    selectedSubdomainForJson,
    countries,
    levels,
    subjects,
    domains,
    subdomains,
  ]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold mb-6 text-foreground">Curriculum Debug Inspector</h1>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Country Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="">Select Country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          {/* Level Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Level</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              disabled={!selectedCountry}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
            >
              <option value="">Select Level</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.label} {level.cycle && `(${level.cycle})`}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedLevel}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
            >
              <option value="">Select Subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {getLocalizedLabel(subject.labels, 'fr')}
                </option>
              ))}
            </select>
          </div>

          {/* Domain Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Domain</label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              disabled={!selectedSubject}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
            >
              <option value="">Select Domain</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.code} - {getLocalizedLabel(domain.labels, 'fr')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Subdomain List */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Subdomains</h2>
              {subdomains.length > 0 ? (
                <div className="space-y-3">
                  {subdomains.map((subdomain) => (
                    <button
                      key={subdomain.id}
                      onClick={() => setSelectedSubdomainForJson(subdomain.id)}
                      className={`w-full text-left p-3 border rounded-md transition-colors ${
                        selectedSubdomainForJson === subdomain.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background hover:bg-accent'
                      }`}
                    >
                      <div className="font-medium text-foreground">
                        {getLocalizedLabel(subdomain.labels, 'fr')}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Code: {subdomain.code}</div>
                      {subdomain.skills && subdomain.skills.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Skills: {subdomain.skills.length}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {selectedDomain
                    ? 'No subdomains found for this domain'
                    : 'Select a domain to view subdomains'}
                </p>
              )}
            </div>
          </div>

          {/* Right Column - JSON Preview */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">JSON Preview</h2>
              {currentNode ? (
                <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[600px] text-sm text-foreground font-mono">
                  {JSON.stringify(currentNode, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">Select an item to view its JSON structure</p>
              )}
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-6 bg-muted border border-border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-2">Current Selection:</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Country: {selectedCountry || 'None'}</p>
            <p>Level: {selectedLevel || 'None'}</p>
            <p>Subject: {selectedSubject || 'None'}</p>
            <p>Domain: {selectedDomain || 'None'}</p>
            <p>
              Subdomain: {selectedSubdomainForJson || 'None'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
