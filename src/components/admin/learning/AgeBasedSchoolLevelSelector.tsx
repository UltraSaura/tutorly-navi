import { useState, useMemo, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Search, Info, Globe } from 'lucide-react';
import { 
  SCHOOL_LEVEL_MAPPING, 
  COUNTRY_CODES, 
  getLevelCode, 
  LANGUAGE_COUNTRIES, 
  COUNTRY_INFO, 
  ALL_COUNTRIES,
  type CountryName 
} from '@/data/schoolLevelMapping';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface AgeBasedSchoolLevelSelectorProps {
  selectedLevels: string[];
  onLevelsChange: (levels: string[]) => void;
  selectedLanguage?: string;
}

export function AgeBasedSchoolLevelSelector({ 
  selectedLevels, 
  onLevelsChange,
  selectedLanguage = 'en'
}: AgeBasedSchoolLevelSelectorProps) {
  const [ageFilter, setAgeFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  // When language changes, suggest countries for that language
  useEffect(() => {
    const suggestedCountries = LANGUAGE_COUNTRIES[selectedLanguage] || [];
    if (suggestedCountries.length > 0) {
      setSelectedCountries(suggestedCountries);
    }
  }, [selectedLanguage]);

  // Countries to display in the table (filtered by selection)
  const displayedCountries = useMemo(() => {
    if (selectedCountries.length === 0) return [...ALL_COUNTRIES];
    return ALL_COUNTRIES.filter(c => selectedCountries.includes(c));
  }, [selectedCountries]);

  // Get identifier for a level: country_code:level_code
  const getLevelIdentifier = (age: number, country: string, levelName: string): string => {
    const countryCode = COUNTRY_CODES[country as keyof typeof COUNTRY_CODES];
    const levelCode = getLevelCode(levelName, country);
    return `${countryCode}:${levelCode}`;
  };

  const isLevelSelected = (age: number, country: string, levelName: string): boolean => {
    const identifier = getLevelIdentifier(age, country, levelName);
    return selectedLevels.includes(identifier);
  };

  const toggleLevel = (age: number, country: string, levelName: string) => {
    const identifier = getLevelIdentifier(age, country, levelName);
    const isSelected = selectedLevels.includes(identifier);

    if (isSelected) {
      onLevelsChange(selectedLevels.filter(l => l !== identifier));
    } else {
      onLevelsChange([...selectedLevels, identifier]);
    }
  };

  const toggleAllForAge = (age: number) => {
    const mapping = SCHOOL_LEVEL_MAPPING.find(m => m.age === age);
    if (!mapping) return;

    // Only include displayed countries
    const allIdentifiersForAge = displayedCountries
      .filter(country => mapping.levels[country as keyof typeof mapping.levels])
      .map(country => {
        const levelName = mapping.levels[country as keyof typeof mapping.levels]!;
        return getLevelIdentifier(age, country, levelName);
      });

    const allSelected = allIdentifiersForAge.every(id => selectedLevels.includes(id));

    if (allSelected) {
      onLevelsChange(selectedLevels.filter(l => !allIdentifiersForAge.includes(l)));
    } else {
      const newSelections = [...selectedLevels];
      allIdentifiersForAge.forEach(id => {
        if (!newSelections.includes(id)) {
          newSelections.push(id);
        }
      });
      onLevelsChange(newSelections);
    }
  };

  const isAllForAgeSelected = (age: number): boolean => {
    const mapping = SCHOOL_LEVEL_MAPPING.find(m => m.age === age);
    if (!mapping) return false;

    const allIdentifiersForAge = displayedCountries
      .filter(country => mapping.levels[country as keyof typeof mapping.levels])
      .map(country => {
        const levelName = mapping.levels[country as keyof typeof mapping.levels]!;
        return getLevelIdentifier(age, country, levelName);
      });

    return allIdentifiersForAge.length > 0 && 
           allIdentifiersForAge.every(id => selectedLevels.includes(id));
  };

  const toggleCountry = (country: string) => {
    if (selectedCountries.includes(country)) {
      setSelectedCountries(selectedCountries.filter(c => c !== country));
    } else {
      setSelectedCountries([...selectedCountries, country]);
    }
  };

  const selectAllForCountry = (country: string) => {
    const identifiers = SCHOOL_LEVEL_MAPPING
      .filter(m => m.levels[country as keyof typeof m.levels])
      .map(m => {
        const levelName = m.levels[country as keyof typeof m.levels]!;
        return getLevelIdentifier(m.age, country, levelName);
      });

    const newSelections = [...selectedLevels];
    identifiers.forEach(id => {
      if (!newSelections.includes(id)) {
        newSelections.push(id);
      }
    });
    onLevelsChange(newSelections);
  };

  const clearCountry = (country: string) => {
    const countryCode = COUNTRY_CODES[country as keyof typeof COUNTRY_CODES];
    onLevelsChange(selectedLevels.filter(l => !l.startsWith(`${countryCode}:`)));
  };

  const filteredMappings = SCHOOL_LEVEL_MAPPING.filter(mapping => {
    const matchesAge = !ageFilter || mapping.age === parseInt(ageFilter);
    const matchesSearch = !searchFilter || 
      displayedCountries.some(country => {
        const levelName = mapping.levels[country as keyof typeof mapping.levels];
        return levelName?.toLowerCase().includes(searchFilter.toLowerCase());
      });
    return matchesAge && matchesSearch;
  });

  const clearAll = () => {
    onLevelsChange([]);
  };

  // Get suggested countries based on selected language
  const suggestedCountries = LANGUAGE_COUNTRIES[selectedLanguage] || [];

  return (
    <div className="space-y-4">
      {/* Country Selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Select Countries</Label>
          {selectedLanguage && (
            <Badge variant="outline" className="text-xs">
              Language: {selectedLanguage === 'en' ? '🇺🇸 English' : selectedLanguage === 'fr' ? '🇫🇷 Français' : selectedLanguage === 'ar' ? '🇸🇦 العربية' : selectedLanguage}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-md border">
          {ALL_COUNTRIES.map((country) => {
            const info = COUNTRY_INFO[country];
            const isSelected = selectedCountries.includes(country);
            const isSuggested = suggestedCountries.includes(country);
            
            return (
              <div key={country} className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleCountry(country)}
                  className={`${isSuggested && !isSelected ? 'border-primary border-dashed' : ''}`}
                >
                  <span className="mr-1">{info.flag}</span>
                  {info.name}
                  {isSuggested && !isSelected && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1">suggested</Badge>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
        {selectedCountries.length > 0 && (
          <div className="flex gap-2">
            {selectedCountries.map(country => {
              const info = COUNTRY_INFO[country];
              return (
                <div key={country} className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => selectAllForCountry(country)}
                    className="text-xs h-7"
                  >
                    Select all {info.flag} {info.name}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => clearCountry(country)}
                    className="text-xs h-7 text-muted-foreground"
                  >
                    Clear
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by level name..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Filter by age (3-18)"
            min="3"
            max="18"
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            className="flex-1"
          />
          {selectedLevels.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium mb-1">How to use:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>First select the countries you want to target (based on the video language)</li>
            <li>Check "Select All" to select all levels for an age across selected countries</li>
            <li>Or check individual boxes to select specific country/level combinations</li>
          </ul>
        </div>
      </div>

      {/* Table */}
      {displayedCountries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Select at least one country above to see school levels</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px] border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[80px] text-center">Age</TableHead>
                <TableHead className="w-[100px] text-center">Select All</TableHead>
                {displayedCountries.map(country => {
                  const info = COUNTRY_INFO[country];
                  return (
                    <TableHead key={country} className="min-w-[150px]">
                      <span className="mr-1">{info.flag}</span>
                      {info.name}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={displayedCountries.length + 2} className="text-center text-muted-foreground py-8">
                    No levels found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMappings.map((mapping) => (
                  <TableRow key={mapping.age}>
                    <TableCell className="text-center font-bold">
                      <Badge variant="outline" className="text-sm">
                        Age {mapping.age}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isAllForAgeSelected(mapping.age)}
                        onCheckedChange={() => toggleAllForAge(mapping.age)}
                      />
                    </TableCell>
                    {displayedCountries.map((country) => {
                      const levelName = mapping.levels[country as keyof typeof mapping.levels];
                      if (!levelName) {
                        return <TableCell key={country} className="text-muted-foreground text-sm">-</TableCell>;
                      }
                      
                      const isSelected = isLevelSelected(mapping.age, country, levelName);
                      const identifier = getLevelIdentifier(mapping.age, country, levelName);
                      
                      return (
                        <TableCell key={country}>
                          <div className="flex items-start gap-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleLevel(mapping.age, country, levelName)}
                              id={identifier}
                            />
                            <Label
                              htmlFor={identifier}
                              className={`text-xs cursor-pointer flex-1 ${
                                isSelected ? 'font-medium' : ''
                              }`}
                            >
                              {levelName}
                            </Label>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      )}

      {/* Selected summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {selectedLevels.length > 0 ? (
            <span>
              <strong>{selectedLevels.length}</strong> level{selectedLevels.length !== 1 ? 's' : ''} selected
            </span>
          ) : (
            <span>No levels selected (video will be visible to all ages/levels)</span>
          )}
        </div>
        {selectedLevels.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('Selected levels:', selectedLevels);
            }}
          >
            View Selected
          </Button>
        )}
      </div>
    </div>
  );
}
