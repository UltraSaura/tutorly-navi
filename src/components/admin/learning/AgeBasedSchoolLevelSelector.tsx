import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Search, Info } from 'lucide-react';
import { SCHOOL_LEVEL_MAPPING, COUNTRY_CODES, getLevelCode } from '@/data/schoolLevelMapping';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface AgeBasedSchoolLevelSelectorProps {
  selectedLevels: string[];
  onLevelsChange: (levels: string[]) => void;
}

export function AgeBasedSchoolLevelSelector({ 
  selectedLevels, 
  onLevelsChange 
}: AgeBasedSchoolLevelSelectorProps) {
  const [ageFilter, setAgeFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const countries = ['UK', 'France', 'US', 'Germany', 'Turkey', 'Canada'];

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

    const allIdentifiersForAge = countries
      .filter(country => mapping.levels[country as keyof typeof mapping.levels])
      .map(country => {
        const levelName = mapping.levels[country as keyof typeof mapping.levels]!;
        return getLevelIdentifier(age, country, levelName);
      });

    const allSelected = allIdentifiersForAge.every(id => selectedLevels.includes(id));

    if (allSelected) {
      // Deselect all for this age
      onLevelsChange(selectedLevels.filter(l => !allIdentifiersForAge.includes(l)));
    } else {
      // Select all for this age
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

    const allIdentifiersForAge = countries
      .filter(country => mapping.levels[country as keyof typeof mapping.levels])
      .map(country => {
        const levelName = mapping.levels[country as keyof typeof mapping.levels]!;
        return getLevelIdentifier(age, country, levelName);
      });

    return allIdentifiersForAge.length > 0 && 
           allIdentifiersForAge.every(id => selectedLevels.includes(id));
  };

  const filteredMappings = SCHOOL_LEVEL_MAPPING.filter(mapping => {
    const matchesAge = !ageFilter || mapping.age === parseInt(ageFilter);
    const matchesSearch = !searchFilter || 
      countries.some(country => {
        const levelName = mapping.levels[country as keyof typeof mapping.levels];
        return levelName?.toLowerCase().includes(searchFilter.toLowerCase());
      });
    return matchesAge && matchesSearch;
  });

  const clearAll = () => {
    onLevelsChange([]);
  };

  return (
    <div className="space-y-4">
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
            <li>Check the box in the "Select All" column to select all school levels for that age across all countries</li>
            <li>Or check individual boxes to select specific country/level combinations</li>
            <li>Levels are organized by age to help you select appropriate content</li>
          </ul>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="h-[600px] border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[80px] text-center">Age</TableHead>
              <TableHead className="w-[120px] text-center">Select All</TableHead>
              <TableHead className="min-w-[150px]">UK</TableHead>
              <TableHead className="min-w-[150px]">France</TableHead>
              <TableHead className="min-w-[150px]">US</TableHead>
              <TableHead className="min-w-[150px]">Germany</TableHead>
              <TableHead className="min-w-[150px]">Turkey</TableHead>
              <TableHead className="min-w-[150px]">Canada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                  {countries.map((country) => {
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
            variant="ghost"
            size="sm"
            onClick={() => {
              // Show selected levels in console or a modal
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
